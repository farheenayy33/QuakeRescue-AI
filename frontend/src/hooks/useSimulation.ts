import { useState, useCallback, useRef, useEffect } from 'react'
import type { BuildingData } from '../components/Buildings'
import type { DebrisData } from '../components/Debris'
import type { SurvivorData } from '../components/Survivor'

const API_BASE = ''

export type Phase = 'IDLE' | 'EARTHQUAKE' | 'SETTLING' | 'RESCUING' | 'COMPLETE'

export interface TimelineEvent {
  time: string
  text: string
  type: 'system' | 'danger' | 'success' | 'path'
}

export interface SimulationState {
  phase: Phase
  magnitude: number
  gridSize: number
  buildings: BuildingData[]
  debris: DebrisData[]
  survivors: SurvivorData[]
  grid: number[][]
  robotPosition: [number, number, number]
  robotPath: [number, number][]
  robotStart: [number, number]
  isRobotMoving: boolean
  earthquakeProgress: number
  rescuedCount: number
  totalSurvivors: number
  elapsedTime: number
  stepsCount: number
  currentAlgorithm: string
  algorithmComparison: Record<string, { path: number[][]; explored_count: number; algorithm: string }> | null
  rescuePosition: [number, number, number] | null
  
  // Custom AAA visual states
  cameraMode: 'third-person' | 'drone' | 'tactical' | 'top-down' | 'fps' | 'cinematic'
  simulationSpeed: number
  batteryLevel: number
  timelineLogs: TimelineEvent[]
  isPaused: boolean
}

const EARTHQUAKE_DURATION = 5 // seconds
const SETTLE_DURATION = 3 // seconds

export function useSimulation() {
  const [state, setState] = useState<SimulationState>({
    phase: 'IDLE',
    magnitude: 8.5,
    gridSize: 40,
    buildings: [],
    debris: [],
    survivors: [],
    grid: [],
    robotPosition: [0, 0, 0],
    robotPath: [],
    robotStart: [0, 0],
    isRobotMoving: false,
    earthquakeProgress: 0,
    rescuedCount: 0,
    totalSurvivors: 0,
    elapsedTime: 0,
    stepsCount: 0,
    currentAlgorithm: 'astar',
    algorithmComparison: null,
    rescuePosition: null,
    cameraMode: 'tactical',
    simulationSpeed: 1,
    batteryLevel: 100,
    timelineLogs: [{ time: '0.0s', text: 'System standby. Awaiting earthquake trigger.', type: 'system' }],
    isPaused: false,
  })

  const phaseTimerRef = useRef(0)
  const rescueTimerRef = useRef(0)
  const pathIndexRef = useRef(0)
  const currentTargetRef = useRef<number | null>(null)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef(0)

  // ── Helper to push logs ──────────────────────────────────────────────
  const appendLog = useCallback((text: string, type: 'system' | 'danger' | 'success' | 'path', time: number) => {
    setState(prev => {
      const timeStr = `${time.toFixed(1)}s`
      // Avoid duplicate logs in very fast loops
      if (prev.timelineLogs.length > 0 && prev.timelineLogs[prev.timelineLogs.length - 1].text === text) {
        return prev
      }
      return {
        ...prev,
        timelineLogs: [...prev.timelineLogs, { time: timeStr, text, type }].slice(-40) // Keep last 40 logs
      }
    })
  }, [])

  // ── Fallback city generation (no backend needed) ────────────────────
  const generateFallbackCity = useCallback(() => {
    const gridSize = 40
    const buildings: BuildingData[] = []
    const colorPresets = ['#8B8680', '#A0937D', '#B5B2AE', '#6B6560', '#9C9488', '#7A756F']

    let attempts = 0
    while (buildings.length < 16 && attempts < 150) {
      attempts++
      const w = 3 + Math.floor(Math.random() * 4)
      const h = 3 + Math.floor(Math.random() * 4)
      const x = 1 + Math.floor(Math.random() * (gridSize - w - 2))
      const y = 1 + Math.floor(Math.random() * (gridSize - h - 2))

      const overlaps = buildings.some(b =>
        !(x + w + 1 < b.x || b.x + b.w + 1 < x || y + h + 1 < b.y || b.y + b.h + 1 < y)
      )
      if (overlaps) continue

      const roll = Math.random()
      let damage: 'collapsed' | 'damaged' | 'intact' = 'intact'
      if (roll < 0.7) damage = 'collapsed'
      else if (roll < 0.9) damage = 'damaged'

      buildings.push({
        x, y, w, h,
        floors: 3 + Math.floor(Math.random() * 10),
        damage,
        color: colorPresets[Math.floor(Math.random() * colorPresets.length)],
      })
    }

    if (buildings.length === 0) {
      buildings.push(
        { x: 5, y: 5, w: 4, h: 4, floors: 6, damage: 'collapsed', color: '#8B8680' },
        { x: 12, y: 8, w: 3, h: 5, floors: 8, damage: 'damaged', color: '#A0937D' },
        { x: 20, y: 15, w: 5, h: 3, floors: 5, damage: 'intact', color: '#B5B2AE' },
      )
    }

    const debris: DebrisData[] = []
    buildings.forEach(b => {
      if (b.damage === 'collapsed' || b.damage === 'damaged') {
        const n = b.damage === 'collapsed' ? 6 : 3
        for (let j = 0; j < n; j++) {
          const angle = Math.random() * Math.PI * 2
          const dist = 1 + Math.random() * Math.max(b.w, b.h)
          debris.push({
            x: Math.floor(b.x + b.w / 2 + Math.cos(angle) * dist),
            y: Math.floor(b.y + b.h / 2 + Math.sin(angle) * dist),
            size: 0.3 + Math.random() * 0.7,
          })
        }
      }
    })

    const damaged = buildings.filter(b => b.damage !== 'intact')
    const survivors: SurvivorData[] = []
    for (let i = 0; i < 6; i++) {
      const b = damaged[i % Math.max(damaged.length, 1)] || buildings[0]
      survivors.push({
        id: i,
        x: b.x + Math.floor(Math.random() * Math.max(b.w, 1)),
        y: b.y + Math.floor(Math.random() * Math.max(b.h, 1)),
        rescued: false,
        state: i % 3 === 0 ? 'critical' : i % 3 === 1 ? 'injured' : 'trapped',
      })
    }

    const grid: number[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(0))
    buildings.forEach(b => {
      if (b.damage !== 'collapsed') {
        for (let dy = 0; dy < b.h; dy++) {
          for (let dx = 0; dx < b.w; dx++) {
            const gy = b.y + dy
            const gx = b.x + dx
            if (gy < gridSize && gx < gridSize) grid[gy][gx] = 1
          }
        }
      }
    })
    debris.forEach(d => {
      if (d.x >= 0 && d.x < gridSize && d.y >= 0 && d.y < gridSize) {
        grid[d.y][d.x] = 1
      }
    })
    survivors.forEach(s => {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = s.y + dy
          const nx = s.x + dx
          if (ny >= 0 && ny < gridSize && nx >= 0 && nx < gridSize) {
            grid[ny][nx] = 0
          }
        }
      }
    })
    grid[0][0] = 0; grid[0][1] = 0; grid[1][0] = 0

    setState(prev => ({
      ...prev,
      buildings,
      debris,
      survivors,
      grid,
      gridSize,
      magnitude: 8.5,
      robotStart: [0, 0],
      robotPosition: [-gridSize / 2, 0, -gridSize / 2],
      totalSurvivors: survivors.length,
    }))
  }, [])

  // ── Generate City ────────────────────────────────────────────────────
  const generateCity = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(`${API_BASE}/api/city`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gridSize: 40, numBuildings: 22, numSurvivors: 6 }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) throw new Error(`API returned ${res.status}`)

      const data = await res.json()
      if (!data.buildings?.length || !data.grid?.length || !data.survivors?.length) {
        throw new Error('Invalid city data from API')
      }

      setState(prev => ({
        ...prev,
        buildings: data.buildings,
        debris: data.debris ?? [],
        survivors: data.survivors.map((s: SurvivorData) => ({
          ...s,
          state: s.id % 3 === 0 ? 'critical' : s.id % 3 === 1 ? 'injured' : 'trapped',
        })),
        grid: data.grid,
        gridSize: data.gridSize,
        magnitude: data.magnitude ?? 8.5,
        robotStart: data.robotStart,
        robotPosition: [
          data.robotStart[0] - data.gridSize / 2,
          0,
          data.robotStart[1] - data.gridSize / 2,
        ],
        totalSurvivors: data.survivors.length,
      }))
    } catch (err) {
      console.error('Failed to connect to backend, generating fallback city...', err)
      generateFallbackCity()
    }
  }, [generateFallbackCity])

  // ── Initialize ───────────────────────────────────────────────────────
  useEffect(() => {
    generateCity()
  }, [generateCity])

  // ── Pathfinding request ──────────────────────────────────────────────
  const findPath = useCallback(async (
    grid: number[][],
    start: [number, number],
    goal: [number, number],
    algorithm: string
  ): Promise<number[][] | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/pathfind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid, start, goal, algorithm }),
      })
      const data = await res.json()
      return data.path && data.path.length > 0 ? data.path : null
    } catch {
      // Fallback: simple inline A* 
      return fallbackPathfind(grid, start, goal)
    }
  }, [])

  // ── Compare algorithms ───────────────────────────────────────────────
  const compareAlgorithms = useCallback(async (
    grid: number[][],
    start: [number, number],
    goal: [number, number]
  ) => {
    try {
      const res = await fetch(`${API_BASE}/api/pathfind/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid, start, goal }),
      })
      const data = await res.json()
      setState(prev => ({ ...prev, algorithmComparison: data.comparisons }))
    } catch {
      // Ignore comparison errors
    }
  }, [])

  // ── Trigger Earthquake ───────────────────────────────────────────────
  const triggerEarthquake = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: 'EARTHQUAKE',
      earthquakeProgress: 0,
      elapsedTime: 0,
      stepsCount: 0,
      rescuedCount: 0,
      rescuePosition: null,
      algorithmComparison: null,
      batteryLevel: 100,
      survivors: prev.survivors.map(s => ({ ...s, rescued: false })),
      timelineLogs: [{ time: '0.0s', text: '⚠️ Magnitude 8.5 earthquake! Buildings collapsing across the city.', type: 'danger' }]
    }))
    phaseTimerRef.current = 0
  }, [])

  // ── Find next survivor and path ─────────────────────────────────────
  const rescueNext = useCallback(async (currentState: SimulationState) => {
    const unrescued = currentState.survivors.filter(s => !s.rescued)
    if (unrescued.length === 0) {
      setState(prev => ({ ...prev, phase: 'COMPLETE', isRobotMoving: false }))
      appendLog('✅ Mission Completed. All survivors successfully rescued.', 'success', currentState.elapsedTime)
      return
    }

    const robotGridX = Math.round(currentState.robotPosition[0] + currentState.gridSize / 2)
    const robotGridZ = Math.round(currentState.robotPosition[2] + currentState.gridSize / 2)
    const start: [number, number] = [
      Math.max(0, Math.min(currentState.gridSize - 1, robotGridX)),
      Math.max(0, Math.min(currentState.gridSize - 1, robotGridZ)),
    ]

    // Find nearest reachable survivor
    let bestPath: number[][] | null = null
    let bestTarget: SurvivorData | null = null

    for (const survivor of unrescued) {
      const goal: [number, number] = [survivor.x, survivor.y]
      const path = await findPath(currentState.grid, start, goal, currentState.currentAlgorithm)
      if (path && (!bestPath || path.length < bestPath.length)) {
        bestPath = path
        bestTarget = survivor
      }
    }

    if (bestPath && bestTarget) {
      // Compare algorithms for this path
      compareAlgorithms(currentState.grid, start, [bestTarget.x, bestTarget.y])

      currentTargetRef.current = bestTarget.id
      pathIndexRef.current = 0

      // Add log
      const algoName = currentState.currentAlgorithm === 'astar' ? 'A* Search' : currentState.currentAlgorithm === 'dijkstra' ? "Dijkstra's" : 'BFS'
      appendLog(`🤖 Routing path to Civilian #${bestTarget.id} using ${algoName}.`, 'path', currentState.elapsedTime)

      setState(prev => ({
        ...prev,
        robotPath: bestPath!.map(p => [p[0], p[1]] as [number, number]),
        isRobotMoving: true,
      }))
    } else {
      // Can't reach any survivor, mark nearest as rescued and try again
      if (unrescued.length > 0) {
        const unreachableTarget = unrescued[0]
        appendLog(`⚠️ Path obstructed to Civilian #${unreachableTarget.id}. Initiating manual clear protocol.`, 'danger', currentState.elapsedTime)
        setState(prev => ({
          ...prev,
          survivors: prev.survivors.map(s =>
            s.id === unreachableTarget.id ? { ...s, rescued: true } : s
          ),
          rescuedCount: prev.rescuedCount + 1,
        }))
      }
    }
  }, [findPath, compareAlgorithms, appendLog])

  // ── Main update loop ─────────────────────────────────────────────────
  useEffect(() => {
    const update = (timestamp: number) => {
      const delta = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0.016
      lastTimeRef.current = timestamp

      setState(prev => {
        if (prev.phase === 'IDLE' || prev.phase === 'COMPLETE') return prev
        if (prev.isPaused) return prev

        const next = { ...prev }
        const adjustedDelta = delta * prev.simulationSpeed

        if (prev.phase === 'EARTHQUAKE') {
          phaseTimerRef.current += adjustedDelta
          next.earthquakeProgress = Math.min(phaseTimerRef.current / EARTHQUAKE_DURATION, 1)
          next.elapsedTime = prev.elapsedTime + adjustedDelta

          if (phaseTimerRef.current >= EARTHQUAKE_DURATION) {
            next.phase = 'SETTLING'
            phaseTimerRef.current = 0
            // Defer execution to let state resolve
            setTimeout(() => appendLog('⌛ Dust settling. Thermal scan: civilians trapped under rubble.', 'danger', next.elapsedTime), 50)
          }
        } else if (prev.phase === 'SETTLING') {
          phaseTimerRef.current += adjustedDelta
          next.elapsedTime = prev.elapsedTime + adjustedDelta

          if (phaseTimerRef.current >= SETTLE_DURATION) {
            next.phase = 'RESCUING'
            phaseTimerRef.current = 0
            const survivorCount = next.totalSurvivors
            const elapsed = next.elapsedTime
            setTimeout(() => {
              appendLog(`🚀 Rescue robot deployed. AI pathfinding to reach ${survivorCount} trapped civilians.`, 'system', elapsed)
              setState(curr => {
                rescueNext(curr)
                return curr
              })
            }, 100)
          }
        } else if (prev.phase === 'RESCUING') {
          next.elapsedTime = prev.elapsedTime + adjustedDelta
          // Battery decay cosmetic logic
          next.batteryLevel = Math.max(0, prev.batteryLevel - adjustedDelta * 0.4)

          // Move robot along path
          if (prev.isRobotMoving && prev.robotPath.length > 0) {
            rescueTimerRef.current += adjustedDelta
            const moveSpeed = 3 // grid cells per second

            if (rescueTimerRef.current >= 1 / moveSpeed) {
              rescueTimerRef.current = 0
              pathIndexRef.current++
              next.stepsCount = prev.stepsCount + 1

              if (pathIndexRef.current < prev.robotPath.length) {
                const [gx, gz] = prev.robotPath[pathIndexRef.current]
                next.robotPosition = [
                  gx - prev.gridSize / 2,
                  0,
                  gz - prev.gridSize / 2,
                ]
              } else {
                // Reached target survivor
                next.isRobotMoving = false
                next.robotPath = []

                if (currentTargetRef.current !== null) {
                  const savedId = currentTargetRef.current
                  next.survivors = prev.survivors.map(s =>
                    s.id === savedId ? { ...s, rescued: true } : s
                  )
                  next.rescuedCount = prev.rescuedCount + 1
                  next.rescuePosition = [...next.robotPosition] as [number, number, number]
                  // Subtract additional battery due to mechanical strain of rescue
                  next.batteryLevel = Math.max(0, next.batteryLevel - 8)

                  setTimeout(() => appendLog(`❤️ Civilian #${savedId} stabilized and transported to safety zone.`, 'success', next.elapsedTime), 50)

                  // Clear rescue sparkle after 2s
                  setTimeout(() => {
                    setState(p => ({ ...p, rescuePosition: null }))
                  }, 2000)

                  currentTargetRef.current = null

                  // Find next survivor
                  setTimeout(() => {
                    setState(curr => {
                      if (curr.rescuedCount >= curr.totalSurvivors) {
                        return { ...curr, phase: 'COMPLETE' }
                      }
                      rescueNext(curr)
                      return curr
                    })
                  }, 500)
                }
              }
            }
          }
        }

        return next
      })

      animFrameRef.current = requestAnimationFrame(update)
    }

    animFrameRef.current = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [rescueNext, appendLog])

  // ── Set algorithm ────────────────────────────────────────────────────
  const setAlgorithm = useCallback((algo: string) => {
    setState(prev => ({ ...prev, currentAlgorithm: algo }))
  }, [])

  // ── Set Camera Mode ──────────────────────────────────────────────────
  const setCameraMode = useCallback((mode: SimulationState['cameraMode']) => {
    setState(prev => ({ ...prev, cameraMode: mode }))
  }, [])

  // ── Set Simulation Speed ─────────────────────────────────────────────
  const setSimulationSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, simulationSpeed: speed }))
  }, [])

  // ── Pause / Resume (frontend simulation control) ───────────────────
  const pauseSimulation = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }))
  }, [])

  const resumeSimulation = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }))
  }, [])

  // ── Restart ──────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    phaseTimerRef.current = 0
    rescueTimerRef.current = 0
    pathIndexRef.current = 0
    currentTargetRef.current = null
    lastTimeRef.current = 0
    setState(prev => ({
      ...prev,
      phase: 'IDLE',
      earthquakeProgress: 0,
      rescuedCount: 0,
      elapsedTime: 0,
      stepsCount: 0,
      isRobotMoving: false,
      robotPath: [],
      rescuePosition: null,
      algorithmComparison: null,
      batteryLevel: 100,
      cameraMode: 'tactical',
      simulationSpeed: 1,
      isPaused: false,
      timelineLogs: [{ time: '0.0s', text: 'System reset. Calibrating mapping matrix.', type: 'system' }],
    }))
    generateCity()
  }, [generateCity])

  return {
    state,
    triggerEarthquake,
    setAlgorithm,
    restart,
    setCameraMode,
    setSimulationSpeed,
    pauseSimulation,
    resumeSimulation,
  }
}

// ── Fallback A* (runs in browser when backend is unavailable) ──────────

function fallbackPathfind(
  grid: number[][],
  start: [number, number],
  goal: [number, number]
): number[][] | null {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  if (!width) return null

  const [sx, sy] = start
  const [gx, gy] = goal
  if (sx < 0 || sx >= width || sy < 0 || sy >= height) return null
  if (gx < 0 || gx >= width || gy < 0 || gy >= height) return null
  if (grid[sy][sx] !== 0 || grid[gy][gx] !== 0) return null
  if (sx === gx && sy === gy) return [[sx, sy]]

  const key = (x: number, y: number) => `${x},${y}`
  const frontier: [number, number, number][] = [[0, sx, sy]] // [priority, x, y]
  const cameFrom = new Map<string, string | null>()
  const costSoFar = new Map<string, number>()
  cameFrom.set(key(sx, sy), null)
  costSoFar.set(key(sx, sy), 0)

  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]

  while (frontier.length > 0) {
    frontier.sort((a, b) => a[0] - b[0])
    const [, cx, cy] = frontier.shift()!

    if (cx === gx && cy === gy) break

    for (const [dx, dy] of dirs) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
      if (grid[ny][nx] !== 0) continue
      const newCost = (costSoFar.get(key(cx, cy)) ?? 0) + 1
      const nk = key(nx, ny)
      if (!costSoFar.has(nk) || newCost < costSoFar.get(nk)!) {
        costSoFar.set(nk, newCost)
        const priority = newCost + Math.abs(gx - nx) + Math.abs(gy - ny)
        frontier.push([priority, nx, ny])
        cameFrom.set(nk, key(cx, cy))
      }
    }
  }

  const goalKey = key(gx, gy)
  if (!cameFrom.has(goalKey)) return null

  const path: number[][] = []
  let cur: string | null = goalKey
  while (cur !== null) {
    const [px, py] = cur.split(',').map(Number)
    path.unshift([px, py])
    cur = cameFrom.get(cur) ?? null
  }
  return path
}
