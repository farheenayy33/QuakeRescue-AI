# 🌍 QuakeRescue AI – Earthquake Rescue Simulation System

## 🚨 Overview

**QuakeRescue AI** is an intelligent disaster response simulation system that demonstrates how AI can assist in rescue operations after an earthquake. The system simulates a realistic 3D city where buildings collapse, civilians get trapped, and an AI-powered rescue robot navigates the environment to save lives using advanced pathfinding algorithms.

This project combines:
- Artificial Intelligence
- Pathfinding Algorithms
- 3D Visualization
- Real-time Simulation UI
- Disaster Management Concepts

---

## 🧠 Core Concept

After an earthquake hits a city:
- Buildings collapse and roads become blocked
- Civilians are trapped under debris
- A rescue robot is deployed
- The AI system calculates the safest route
- Survivors are detected and rescued step-by-step

The system uses backend algorithms (already implemented) to determine:
- Safe paths
- Unsafe zones
- Optimal rescue routes

---

## ⚙️ Tech Stack

### Frontend
- React.js
- TypeScript
- Vite
- Three.js
- React Three Fiber
- Framer Motion
- GSAP
- Tailwind CSS
- ShadCN UI

### Backend
- Node.js / Express (or your backend stack)
- Pathfinding Algorithms:
  - A* Algorithm
  - Dijkstra Algorithm
  - BFS / DFS

---

## 🏙️ Features

### 🌐 3D City Simulation
- Realistic urban environment
- Roads, buildings, hospitals, bridges, parks
- Dynamic camera movement

### 🌪️ Earthquake Effects
- Collapsed buildings
- Blocked roads
- Fire & smoke effects
- Hazard zones

### 🤖 AI Rescue Robot
- Autonomous movement
- Survivor detection system
- Path-following behavior
- Rescue animations

### 👥 Survivors System
- Civilians placed in random locations
- States:
  - Safe
  - Injured
  - Critical
  - Trapped

### 🧭 Pathfinding System
- AI calculates safest route
- Avoids danger zones
- Updates in real time

### 📊 Control Dashboard
- Mission status
- Survivor count
- Robot battery level
- Algorithm selection
- Simulation controls

---

## 🎮 Camera Modes
- Third-person robot view (PUBG style)
- Drone view
- Top-down tactical map
- Cinematic free camera
- First-person robot view

---

## 🧩 Project Structure

QuakeRescueAI
│
├── backend
│   ├── __pycache__/
│   ├── venv/
│   │
│   ├── core/
│   │   ├── a_star.py              # Pathfinding algorithm
│   │   ├── dijkstra.py           # (optional backup routing)
│   │   ├── risk_analyzer.py      # unsafe zone detection
│   │   ├── rescue_engine.py      # AI decision system
│   │
│   ├── api/
│   │   ├── app.py                # Flask/FastAPI entry
│   │   ├── routes.py             # API endpoints
│   │   ├── models.py             # request/response schemas
│   │
│   ├── simulation/
│   │   ├── city_graph.py         # grid / graph representation
│   │   ├── earthquake_model.py   # hazard simulation logic
│   │   ├── survivor_generator.py # spawn trapped humans
│   │
│   ├── requirements.txt
│   └── config.py
│
│
├── frontend
│   │
│   ├── public
│   │   ├── models/               # 3D models (robot, humans, buildings)
│   │   ├── textures/             # materials
│   │   ├── hdr/                  # lighting environment
│   │   ├── sounds/               # earthquake + ambience
│   │
│   ├── src
│   │   │
│   │   ├── engine/
│   │   │   ├── scene.tsx         # main 3D world
│   │   │   ├── renderer.tsx      # WebGL setup
│   │   │   ├── lighting.tsx      # HDR + shadows
│   │   │
│   │   ├── world/
│   │   │   ├── city/
│   │   │   │   ├── CityBuilder.tsx
│   │   │   │   ├── Buildings.tsx
│   │   │   │   ├── Roads.tsx
│   │   │   │
│   │   │   ├── earthquake/
│   │   │   │   ├── ShakeSystem.tsx
│   │   │   │   ├── CollapseSystem.tsx
│   │   │   │
│   │   │   ├── humans/
│   │   │   │   ├── Civilian.tsx
│   │   │   │   ├── Survivor.tsx
│   │   │   │
│   │   │   ├── robot/
│   │   │   │   ├── RescueRobot.tsx
│   │   │   │   ├── RobotAIController.tsx
│   │   │
│   │   ├── systems/
│   │   │   ├── pathfinding/
│   │   │   │   ├── apiBridge.ts   # connects backend A*
│   │   │   │   ├── pathRenderer.ts
│   │   │   │
│   │   │   ├── rescue/
│   │   │   │   ├── missionManager.ts
│   │   │   │   ├── survivorTracker.ts
│   │   │   │
│   │   │   ├── hazards/
│   │   │   │   ├── dangerZones.ts
│   │   │   │
│   │   ├── ui/
│   │   │   ├── hud/
│   │   │   │   ├── GameHUD.tsx     # PUBG-style overlay
│   │   │   │   ├── StatusBar.tsx
│   │   │   │   ├── MissionPanel.tsx
│   │   │   │
│   │   │   ├── overlays/
│   │   │   │   ├── WarningOverlay.tsx
│   │   │   │   ├── EarthquakeAlert.tsx
│   │   │   │
│   │   │   ├── worldUI/
│   │   │   │   ├── SurvivorMarker.tsx
│   │   │   │   ├── SafePathGlow.tsx
│   │   │
│   │   ├── store/
│   │   │   ├── useGameStore.ts    # Zustand state
│   │   │
│   │   ├── utils/
│   │   │   ├── math.ts
│   │   │   ├── constants.ts
│   │   │
│   │   ├── App.tsx
│   │   └── main.tsx
│
│
├── README.md
├── package.json
└── vite.config.ts