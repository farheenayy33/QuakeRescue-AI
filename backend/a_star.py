"""
Pathfinding Algorithms for QuakeRescueAI
=========================================
Implements three algorithms:
  1. A* Search      — Optimal path with Manhattan distance heuristic
  2. Dijkstra's     — Optimal path without heuristic (uniform cost)
  3. BFS            — Shortest path by hop count (unweighted)

All algorithms work on a 2D grid where 0 = walkable, non-zero = blocked.
"""

import heapq
from collections import deque


# ---------------------------------------------------------------------------
# Heuristics
# ---------------------------------------------------------------------------

def manhattan(a, b):
    """Manhattan distance heuristic."""
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def euclidean(a, b):
    """Euclidean distance heuristic."""
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

DIRECTIONS = [(0, 1), (1, 0), (0, -1), (-1, 0)]  # 4-connected


def _reconstruct(came_from, goal):
    """Trace back from goal to start using the came_from map."""
    path = []
    current = goal
    while current is not None:
        path.append(list(current))
        current = came_from[current]
    path.reverse()
    return path


def _validate(grid, start, goal):
    """Return (width, height) or None if inputs are invalid."""
    if not grid or not grid[0]:
        return None
    height = len(grid)
    width = len(grid[0])
    if not (0 <= start[0] < width and 0 <= start[1] < height):
        return None
    if not (0 <= goal[0] < width and 0 <= goal[1] < height):
        return None
    if grid[start[1]][start[0]] != 0 or grid[goal[1]][goal[0]] != 0:
        return None
    return width, height


# ---------------------------------------------------------------------------
# 1.  A* Search
# ---------------------------------------------------------------------------

def a_star(grid, start, goal):
    """
    A* pathfinding with Manhattan distance heuristic.

    Parameters
    ----------
    grid  : list[list[int]]  – 2D grid (0 = walkable)
    start : tuple(x, y)
    goal  : tuple(x, y)

    Returns
    -------
    dict with keys:
        path            – list of [x, y] from start→goal, or []
        explored_count  – number of nodes expanded
        algorithm       – "A*"
    """
    start = tuple(start)
    goal = tuple(goal)

    if start == goal:
        return {"path": [list(start)], "explored_count": 0, "algorithm": "A*"}

    dims = _validate(grid, start, goal)
    if dims is None:
        return {"path": [], "explored_count": 0, "algorithm": "A*"}
    width, height = dims

    frontier = []
    heapq.heappush(frontier, (0, start))
    came_from = {start: None}
    cost_so_far = {start: 0}
    explored = 0

    while frontier:
        _, current = heapq.heappop(frontier)
        explored += 1

        if current == goal:
            return {
                "path": _reconstruct(came_from, goal),
                "explored_count": explored,
                "algorithm": "A*",
            }

        for dx, dy in DIRECTIONS:
            nb = (current[0] + dx, current[1] + dy)
            if 0 <= nb[0] < width and 0 <= nb[1] < height and grid[nb[1]][nb[0]] == 0:
                new_cost = cost_so_far[current] + 1
                if nb not in cost_so_far or new_cost < cost_so_far[nb]:
                    cost_so_far[nb] = new_cost
                    priority = new_cost + manhattan(goal, nb)
                    heapq.heappush(frontier, (priority, nb))
                    came_from[nb] = current

    return {"path": [], "explored_count": explored, "algorithm": "A*"}


# ---------------------------------------------------------------------------
# 2.  Dijkstra's Algorithm
# ---------------------------------------------------------------------------

def dijkstra(grid, start, goal):
    """
    Dijkstra's shortest-path algorithm (uniform cost search).

    Same interface as a_star but does NOT use a heuristic, so it
    explores more nodes but is guaranteed optimal on weighted graphs.
    """
    start = tuple(start)
    goal = tuple(goal)

    if start == goal:
        return {"path": [list(start)], "explored_count": 0, "algorithm": "Dijkstra"}

    dims = _validate(grid, start, goal)
    if dims is None:
        return {"path": [], "explored_count": 0, "algorithm": "Dijkstra"}
    width, height = dims

    frontier = []
    heapq.heappush(frontier, (0, start))
    came_from = {start: None}
    cost_so_far = {start: 0}
    explored = 0

    while frontier:
        current_cost, current = heapq.heappop(frontier)
        explored += 1

        if current == goal:
            return {
                "path": _reconstruct(came_from, goal),
                "explored_count": explored,
                "algorithm": "Dijkstra",
            }

        # Skip if we already found a better path
        if current_cost > cost_so_far.get(current, float('inf')):
            continue

        for dx, dy in DIRECTIONS:
            nb = (current[0] + dx, current[1] + dy)
            if 0 <= nb[0] < width and 0 <= nb[1] < height and grid[nb[1]][nb[0]] == 0:
                new_cost = cost_so_far[current] + 1
                if nb not in cost_so_far or new_cost < cost_so_far[nb]:
                    cost_so_far[nb] = new_cost
                    heapq.heappush(frontier, (new_cost, nb))
                    came_from[nb] = current

    return {"path": [], "explored_count": explored, "algorithm": "Dijkstra"}


# ---------------------------------------------------------------------------
# 3.  Breadth-First Search (BFS)
# ---------------------------------------------------------------------------

def bfs(grid, start, goal):
    """
    BFS pathfinding – finds shortest path by hop count.

    Explores all neighbours level by level. Optimal for uniform-cost grids.
    Explores significantly more nodes than A* but simpler.
    """
    start = tuple(start)
    goal = tuple(goal)

    if start == goal:
        return {"path": [list(start)], "explored_count": 0, "algorithm": "BFS"}

    dims = _validate(grid, start, goal)
    if dims is None:
        return {"path": [], "explored_count": 0, "algorithm": "BFS"}
    width, height = dims

    queue = deque([start])
    came_from = {start: None}
    explored = 0

    while queue:
        current = queue.popleft()
        explored += 1

        if current == goal:
            return {
                "path": _reconstruct(came_from, goal),
                "explored_count": explored,
                "algorithm": "BFS",
            }

        for dx, dy in DIRECTIONS:
            nb = (current[0] + dx, current[1] + dy)
            if (
                0 <= nb[0] < width
                and 0 <= nb[1] < height
                and grid[nb[1]][nb[0]] == 0
                and nb not in came_from
            ):
                came_from[nb] = current
                queue.append(nb)

    return {"path": [], "explored_count": explored, "algorithm": "BFS"}


# ---------------------------------------------------------------------------
# Algorithm dispatcher
# ---------------------------------------------------------------------------

ALGORITHMS = {
    "astar": a_star,
    "dijkstra": dijkstra,
    "bfs": bfs,
}


def find_path(grid, start, goal, algorithm="astar"):
    """
    Unified interface — pick algorithm by name.

    Parameters
    ----------
    algorithm : str – one of 'astar', 'dijkstra', 'bfs'
    """
    fn = ALGORITHMS.get(algorithm, a_star)
    return fn(grid, start, goal)
