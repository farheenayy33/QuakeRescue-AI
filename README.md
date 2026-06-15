# 🌍 QuakeRescueAI

> AI-Powered Earthquake Rescue Simulation using BFS, Dijkstra, and A* Pathfinding Algorithms

QuakeRescueAI is a disaster-response simulation system that demonstrates how Artificial Intelligence can assist rescue operations after an earthquake. The system generates an earthquake-affected city, places survivors in danger zones, and uses pathfinding algorithms to guide rescue robots through the safest routes.

---

## ✨ Features

* 🌆 3D City Environment
* 🌍 Earthquake Simulation
* 🤖 Autonomous Rescue Robot
* 🚑 Survivor Rescue Operations
* 🧠 BFS Pathfinding
* 🧠 Dijkstra Pathfinding
* 🧠 A* Pathfinding
* 📊 Algorithm Performance Comparison
* ⚡ Real-Time Route Visualization
* 🎮 Interactive Web Interface

---

## 🏗️ Tech Stack

### Frontend

* React
* TypeScript
* Tailwind CSS
* Three.js
* React Three Fiber

### Backend

* Python
* Flask

### Algorithms

* BFS
* Dijkstra
* A*

---

## 📂 Project Structure

```bash
QuakeRescueAI
│
├── backend
│   ├── app.py
│   ├
│   ├
│   ├── a_star.py
│   └── requirements.txt
│
├── frontend
│   ├── src
│   ├── public
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 🚀 Getting Started

### Clone Repository

```bash
git clone https://github.com/farheenayy33/QuakeRescue-AI.git
cd QuakeRescueAI
```

---

## ⚙️ Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
python app.py
```

Backend runs on:

```bash
http://localhost:5000
```

---

## 🎨 Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend runs on:

```bash
http://localhost:5173
```

---

## 📊 Algorithm Comparison

| Algorithm | Heuristic | Optimal Path   | Performance |
| --------- | --------- | -------------- | ----------- |
| BFS       | ❌         | ✅ (Unweighted) | Basic       |
| Dijkstra  | ❌         | ✅              | Good        |
| A*        | ✅         | ✅              | Best        |

---

## 🎮 How It Works

1. Generate a city environment.
2. Simulate earthquake damage.
3. Place survivors in danger zones.
4. Select a pathfinding algorithm.
5. Calculate the rescue route.
6. Visualize robot navigation.
7. Compare algorithm performance.

---

## 🔮 Future Improvements

* Multiple Rescue Robots
* Real Map Integration
* Machine Learning Predictions
* Drone-Assisted Rescue
* Hazard Heatmaps
* Real-Time Disaster Data

---

## 👨‍💻 Author

**Farheen Laraib**


---

## ⭐ Support

If you find this project useful, consider giving it a star.
