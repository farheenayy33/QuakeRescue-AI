import { motion } from 'framer-motion'
import { useSimulation } from './hooks/useSimulation'
import CityScene from './components/CityScene'
import HUD from './components/HUD'
import './App.css'

function App() {
  const {
    state,
    triggerEarthquake,
    setAlgorithm,
    restart,
    setCameraMode,
    setSimulationSpeed,
    pauseSimulation,
    resumeSimulation,
  } = useSimulation()

  const isShaking = state.phase === 'EARTHQUAKE'

  return (
    <div className="app-container">
      {/* Premium loading sequence */}
      {state.buildings.length === 0 && (
        <motion.div
          className="loading-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="loading-logo-box"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Q
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            QuakeRescue AI
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            Initializing 3D city environment...
          </motion.p>
          <div className="loading-bar">
            <div className="loading-bar-fill" />
          </div>
        </motion.div>
      )}

      {/* 3D City Scene */}
      <div className={`canvas-wrapper ${isShaking ? 'shaking' : ''}`}>
        <CityScene
          buildings={state.buildings}
          debris={state.debris}
          survivors={state.survivors}
          gridSize={state.gridSize}
          phase={state.phase}
          earthquakeProgress={state.earthquakeProgress}
          robotPosition={state.robotPosition}
          robotPath={state.robotPath}
          isRobotMoving={state.isRobotMoving}
          rescuePosition={state.rescuePosition}
          cameraMode={state.cameraMode}
        />
      </div>

      {/* Game-style HUD overlay */}
      {state.buildings.length > 0 && (
        <HUD
          state={state}
          onTriggerEarthquake={triggerEarthquake}
          onRestart={restart}
          onSetAlgorithm={setAlgorithm}
          onSetCameraMode={setCameraMode}
          onSetSimulationSpeed={setSimulationSpeed}
          onPause={pauseSimulation}
          onResume={resumeSimulation}
        />
      )}
    </div>
  )
}

export default App
