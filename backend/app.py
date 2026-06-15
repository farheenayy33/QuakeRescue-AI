"""
QuakeRescueAI — Flask Backend
==============================
REST API serving:
  • /api/pathfind   — Run A*, Dijkstra, or BFS on a grid
  • /api/city       — Generate a random city layout for 8.5-magnitude scenario
  • /api/algorithms — List available algorithms with descriptions
"""

import random, math, json, os
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from a_star import find_path, ALGORITHMS

app = Flask(__name__)
CORS(app)

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))

# ── Earthquake parameters for magnitude 8.5 ──────────────────────────────
MAGNITUDE = 8.5
COLLAPSE_FULL_PROB = 0.70      # 70 % buildings fully collapse
COLLAPSE_PARTIAL_PROB = 0.30   # 30 % partially damaged
DEBRIS_PER_COLLAPSE = 6        # rubble piles per collapsed building
GRID_SIZE = 40                 # pathfinding grid resolution
NUM_BUILDINGS = 18             # city buildings
NUM_SURVIVORS = 5              # stuck people


def _random_buildings(count, grid_w, grid_h, cell=1):
    """Generate non-overlapping building footprints."""
    buildings = []
    for _ in range(count * 3):          # try up to 3× to avoid overlaps
        if len(buildings) >= count:
            break
        w = random.randint(3, 6)
        h = random.randint(3, 6)
        x = random.randint(1, grid_w - w - 1)
        y = random.randint(1, grid_h - h - 1)
        rect = (x, y, w, h)

        # overlap check
        overlap = False
        for b in buildings:
            bx, by, bw, bh = b["x"], b["y"], b["w"], b["h"]
            if not (x + w + 1 < bx or bx + bw + 1 < x or y + h + 1 < by or by + bh + 1 < y):
                overlap = True
                break
        if overlap:
            continue

        # Determine damage level based on magnitude 8.5
        roll = random.random()
        if roll < COLLAPSE_FULL_PROB:
            damage = "collapsed"
            floors = random.randint(3, 12)
        elif roll < COLLAPSE_FULL_PROB + COLLAPSE_PARTIAL_PROB:
            damage = "damaged"
            floors = random.randint(3, 15)
        else:
            damage = "intact"
            floors = random.randint(5, 15)

        color_presets = [
            "#8B8680", "#A0937D", "#B5B2AE", "#6B6560",
            "#9C9488", "#7A756F", "#C4BBAF", "#887E73",
        ]

        buildings.append({
            "x": x, "y": y, "w": w, "h": h,
            "floors": floors,
            "damage": damage,
            "color": random.choice(color_presets),
        })
    return buildings


def _generate_debris(buildings, grid_w, grid_h):
    """Scatter debris around collapsed buildings."""
    debris = []
    for b in buildings:
        if b["damage"] == "collapsed":
            n = DEBRIS_PER_COLLAPSE
        elif b["damage"] == "damaged":
            n = DEBRIS_PER_COLLAPSE // 2
        else:
            continue
        cx = b["x"] + b["w"] / 2
        cy = b["y"] + b["h"] / 2
        for _ in range(n):
            angle = random.uniform(0, 2 * math.pi)
            dist = random.uniform(1, max(b["w"], b["h"]) + 2)
            dx = int(cx + math.cos(angle) * dist)
            dy = int(cy + math.sin(angle) * dist)
            if 0 <= dx < grid_w and 0 <= dy < grid_h:
                debris.append({"x": dx, "y": dy, "size": random.uniform(0.3, 1.0)})
    return debris


def _place_survivors(buildings, grid_w, grid_h, count):
    """Place survivors near collapsed / damaged buildings."""
    candidates = [b for b in buildings if b["damage"] in ("collapsed", "damaged")]
    if not candidates:
        candidates = buildings
    survivors = []
    for i in range(count):
        b = random.choice(candidates)
        sx = b["x"] + random.randint(0, b["w"] - 1)
        sy = b["y"] + random.randint(0, b["h"] - 1)
        sx = max(0, min(grid_w - 1, sx))
        sy = max(0, min(grid_h - 1, sy))
        survivors.append({"id": i, "x": sx, "y": sy, "rescued": False})
    return survivors


def _build_grid(grid_w, grid_h, buildings, debris):
    """Create a 2D walkability grid (0 = open, 1 = blocked)."""
    grid = [[0] * grid_w for _ in range(grid_h)]

    # Mark standing buildings as blocked
    for b in buildings:
        if b["damage"] != "collapsed":
            for dy in range(b["h"]):
                for dx in range(b["w"]):
                    gy = b["y"] + dy
                    gx = b["x"] + dx
                    if 0 <= gx < grid_w and 0 <= gy < grid_h:
                        grid[gy][gx] = 1

    # Mark debris as blocked
    for d in debris:
        if 0 <= d["x"] < grid_w and 0 <= d["y"] < grid_h:
            grid[d["y"]][d["x"]] = 1

    return grid


# ── API Routes ────────────────────────────────────────────────────────────

@app.route("/api/algorithms", methods=["GET"])
def list_algorithms():
    """Return available pathfinding algorithms."""
    return jsonify({
        "algorithms": [
            {"id": "astar",    "name": "A* Search",     "description": "Optimal path with Manhattan distance heuristic. Fast and efficient."},
            {"id": "dijkstra", "name": "Dijkstra's",    "description": "Uniform cost search. Optimal but explores more nodes than A*."},
            {"id": "bfs",      "name": "BFS",           "description": "Breadth-first search. Finds shortest hop-count path. No heuristic."},
        ]
    })


@app.route("/api/city", methods=["POST"])
def generate_city():
    """
    Generate a random city layout for the simulation.

    Optional body: { "gridSize": 40, "numBuildings": 18, "numSurvivors": 5 }
    """
    data = request.get_json(silent=True) or {}
    grid_w = data.get("gridSize", GRID_SIZE)
    grid_h = grid_w
    num_b = data.get("numBuildings", NUM_BUILDINGS)
    num_s = data.get("numSurvivors", NUM_SURVIVORS)

    buildings = _random_buildings(num_b, grid_w, grid_h)
    debris = _generate_debris(buildings, grid_w, grid_h)
    survivors = _place_survivors(buildings, grid_w, grid_h, num_s)
    grid = _build_grid(grid_w, grid_h, buildings, debris)

    # Robot start — find an open cell in the top-left area
    robot_start = [0, 0]
    for sy in range(grid_h):
        for sx in range(grid_w):
            if grid[sy][sx] == 0:
                robot_start = [sx, sy]
                break
        if robot_start != [0, 0]:
            break

    # Ensure survivor cells are walkable
    for s in survivors:
        grid[s["y"]][s["x"]] = 0
        # Clear a small radius around survivors
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                ny, nx = s["y"] + dy, s["x"] + dx
                if 0 <= ny < grid_h and 0 <= nx < grid_w:
                    grid[ny][nx] = 0

    return jsonify({
        "gridSize": grid_w,
        "magnitude": MAGNITUDE,
        "buildings": buildings,
        "debris": debris,
        "survivors": survivors,
        "grid": grid,
        "robotStart": robot_start,
    })


@app.route("/api/pathfind", methods=["POST"])
def pathfind():
    """
    Run pathfinding on a grid.

    Body: {
      "grid": [[0,1,...], ...],
      "start": [x, y],
      "goal": [x, y],
      "algorithm": "astar" | "dijkstra" | "bfs"   (default: "astar")
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    grid = data.get("grid")
    start = data.get("start")
    goal = data.get("goal")
    algo = data.get("algorithm", "astar")

    if not grid or not start or not goal:
        return jsonify({"error": "grid, start, goal are required"}), 400

    result = find_path(grid, tuple(start), tuple(goal), algo)
    return jsonify(result)


@app.route("/api/pathfind/compare", methods=["POST"])
def compare_algorithms():
    """
    Run ALL algorithms on the same grid/start/goal and return comparative
    results so the frontend can display efficiency metrics.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    grid = data.get("grid")
    start = tuple(data.get("start", [0, 0]))
    goal = tuple(data.get("goal", [0, 0]))

    results = {}
    for algo_id in ALGORITHMS:
        results[algo_id] = find_path(grid, start, goal, algo_id)

    return jsonify({"comparisons": results})


# ── Entry Point ───────────────────────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve the built React app — API routes take priority via registration order."""
    if path.startswith('api/') or path.startswith('api'):
        abort(404)
    if path and os.path.isfile(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    index = os.path.join(FRONTEND_DIST, 'index.html')
    if os.path.isfile(index):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return jsonify({
        'error': 'Frontend not built. Run: cd frontend && npm run build'
    }), 503


if __name__ == "__main__":
    print("QuakeRescueAI running on http://localhost:5000")
    print("  Frontend + Backend on single port")
    app.run(debug=True, port=5000)
