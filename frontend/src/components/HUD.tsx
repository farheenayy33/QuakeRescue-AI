import { useRef, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Phase, SimulationState } from '../hooks/useSimulation'

interface HUDProps {
  state: SimulationState
  onTriggerEarthquake: () => void
  onRestart: () => void
  onSetAlgorithm: (algo: string) => void
  onSetCameraMode: (mode: SimulationState['cameraMode']) => void
  onSetSimulationSpeed: (speed: number) => void
  onPause: () => void
  onResume: () => void
}

const ALGORITHMS = [
  { id: 'astar', name: 'A*' },
  { id: 'dijkstra', name: 'Dijkstra' },
  { id: 'bfs', name: 'BFS' },
]

const CAMERAS: { id: SimulationState['cameraMode']; label: string }[] = [
  { id: 'tactical', label: 'Overview' },
  { id: 'third-person', label: 'Robot' },
  { id: 'cinematic', label: 'Cinematic' },
]

function phaseLabel(phase: Phase) {
  switch (phase) {
    case 'IDLE': return 'Ready'
    case 'EARTHQUAKE': return 'Earthquake'
    case 'SETTLING': return 'Aftershock'
    case 'RESCUING': return 'Rescue AI Active'
    case 'COMPLETE': return 'Complete'
  }
}

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export default function HUD({
  state,
  onTriggerEarthquake,
  onRestart,
  onSetAlgorithm,
  onSetCameraMode,
  onSetSimulationSpeed,
  onPause,
  onResume,
}: HUDProps) {
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const [showLog, setShowLog] = useState(false)
  const remaining = state.totalSurvivors - state.rescuedCount
  const isActive = state.phase !== 'IDLE' && state.phase !== 'COMPLETE'
  const progress = state.totalSurvivors > 0 ? (state.rescuedCount / state.totalSurvivors) * 100 : 0

  useEffect(() => {
    const canvas = minimapRef.current
    if (!canvas || !state.grid.length || !isActive) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gs = state.gridSize
    const size = canvas.width
    const scale = size / gs

    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(0, 0, size, size)

    for (let y = 0; y < gs; y++) {
      for (let x = 0; x < gs; x++) {
        if (state.grid[y]?.[x] === 1) {
          ctx.fillStyle = '#94a3b8'
          ctx.fillRect(x * scale, y * scale, scale, scale)
        }
      }
    }

    if (state.robotPath.length > 1) {
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      state.robotPath.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px * scale + scale / 2, py * scale + scale / 2)
        else ctx.lineTo(px * scale + scale / 2, py * scale + scale / 2)
      })
      ctx.stroke()
    }

    state.survivors.forEach(s => {
      if (s.rescued) return
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(s.x * scale + scale / 2, s.y * scale + scale / 2, 2, 0, Math.PI * 2)
      ctx.fill()
    })

    const rx = Math.round(state.robotPosition[0] + gs / 2)
    const rz = Math.round(state.robotPosition[2] + gs / 2)
    ctx.fillStyle = '#2563eb'
    ctx.beginPath()
    ctx.arc(rx * scale + scale / 2, rz * scale + scale / 2, 3, 0, Math.PI * 2)
    ctx.fill()
  }, [state, isActive])

  const latestLog = useMemo(() => state.timelineLogs[state.timelineLogs.length - 1], [state.timelineLogs])

  return (
    <div className="hud-overlay hud-compact">
      {/* Slim top bar */}
      <div className="hud-top-bar">
        <div className="hud-brand">
          <span className="hud-logo">Q</span>
          <span className="hud-title">QuakeRescue AI</span>
          <span className={`hud-phase hud-phase-${state.phase.toLowerCase()}`}>{phaseLabel(state.phase)}</span>
        </div>
        <div className="hud-stats-row">
          <span>M{state.magnitude.toFixed(1)}</span>
          <span>Rescued {state.rescuedCount}/{state.totalSurvivors}</span>
          <span>Trapped {remaining}</span>
          <span>{formatTime(state.elapsedTime)}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <button className="hud-log-toggle" onClick={() => setShowLog(v => !v)}>
          {showLog ? 'Hide Log' : 'AI Log'}
        </button>
      </div>

      {/* Center stays empty — city visible */}
      <div className="hud-viewport-spacer" />

      {/* Floating minimap — bottom left, small */}
      {isActive && (
        <div className="hud-minimap-float">
          <canvas ref={minimapRef} width={100} height={100} />
        </div>
      )}

      {/* Collapsible AI log — top right */}
      <AnimatePresence>
        {showLog && (
          <motion.div
            className="hud-log-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {state.timelineLogs.slice(-8).map((log, i) => (
              <div key={i} className={`hud-log-line hud-log-${log.type}`}>
                <span>{log.time}</span> {log.text}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Latest AI message ticker */}
      {isActive && latestLog && !showLog && (
        <div className="hud-ticker">{latestLog.text}</div>
      )}

      {/* Bottom controls */}
      <div className="hud-bottom-bar">
        <div className="hud-bottom-left">
          {CAMERAS.map(c => (
            <button
              key={c.id}
              className={`hud-chip ${state.cameraMode === c.id ? 'active' : ''}`}
              onClick={() => onSetCameraMode(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="hud-bottom-center">
          {state.phase === 'IDLE' && (
            <>
              <select
                className="hud-select"
                value={state.currentAlgorithm}
                onChange={e => onSetAlgorithm(e.target.value)}
              >
                {ALGORITHMS.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <button className="hud-btn hud-btn-danger" onClick={onTriggerEarthquake}>
                Trigger Earthquake
              </button>
            </>
          )}
          {isActive && !state.isPaused && (
            <button className="hud-btn" onClick={onPause}>Pause</button>
          )}
          {isActive && state.isPaused && (
            <button className="hud-btn" onClick={onResume}>Resume</button>
          )}
          {state.phase === 'EARTHQUAKE' && (
            <span className="hud-status-msg">Buildings collapsing…</span>
          )}
          {state.phase === 'SETTLING' && (
            <span className="hud-status-msg">Civilians trapped under debris</span>
          )}
          {state.phase === 'RESCUING' && (
            <span className="hud-status-msg">AI robot finding safe paths…</span>
          )}
          {state.phase === 'COMPLETE' && (
            <button className="hud-btn hud-btn-success" onClick={onRestart}>New Mission</button>
          )}
          {isActive && (
            <button className="hud-btn hud-btn-ghost" onClick={onRestart}>Reset</button>
          )}
        </div>

        <div className="hud-bottom-right">
          {[0.5, 1, 2, 4].map(sp => (
            <button
              key={sp}
              className={`hud-chip ${state.simulationSpeed === sp ? 'active' : ''}`}
              onClick={() => onSetSimulationSpeed(sp)}
            >
              {sp}x
            </button>
          ))}
        </div>
      </div>

      {/* Mission complete */}
      <AnimatePresence>
        {state.phase === 'COMPLETE' && (
          <motion.div className="completion-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="completion-card" initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}>
              <h2>Mission Complete</h2>
              <p>All {state.totalSurvivors} civilians rescued in {formatTime(state.elapsedTime)}</p>
              <div className="completion-stats-grid">
                <div className="completion-stat-card">
                  <div className="completion-stat-label">Steps</div>
                  <div className="completion-stat-value">{state.stepsCount}</div>
                </div>
                <div className="completion-stat-card">
                  <div className="completion-stat-label">Algorithm</div>
                  <div className="completion-stat-value highlight">
                    {ALGORITHMS.find(a => a.id === state.currentAlgorithm)?.name}
                  </div>
                </div>
                <div className="completion-stat-card">
                  <div className="completion-stat-label">Battery</div>
                  <div className="completion-stat-value">{Math.round(state.batteryLevel)}%</div>
                </div>
              </div>
              <button className="hud-btn hud-btn-success" onClick={onRestart}>Play Again</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
