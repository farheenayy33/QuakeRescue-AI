import { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Ground from './Ground'
import Buildings from './Buildings'
import type { BuildingData } from './Buildings'
import Debris from './Debris'
import type { DebrisData } from './Debris'
import Robot from './Robot'
import Survivor from './Survivor'
import type { SurvivorData } from './Survivor'
import ParticleEffects from './ParticleEffects'
import DangerZones from './DangerZones'
import Landmarks from './Landmarks'

interface CitySceneProps {
  buildings: BuildingData[]
  debris: DebrisData[]
  survivors: SurvivorData[]
  gridSize: number
  phase: string
  earthquakeProgress: number
  robotPosition: [number, number, number]
  robotPath: [number, number][]
  isRobotMoving: boolean
  rescuePosition: [number, number, number] | null
  cameraMode: 'third-person' | 'drone' | 'tactical' | 'top-down' | 'fps' | 'cinematic'
}

export default function CityScene({
  buildings,
  debris,
  survivors,
  gridSize,
  phase,
  earthquakeProgress,
  robotPosition,
  robotPath,
  isRobotMoving,
  rescuePosition,
  cameraMode,
}: CitySceneProps) {
  const isShaking = phase === 'EARTHQUAKE'

  return (
    <Canvas
      shadows
      style={{ width: '100%', height: '100%', display: 'block' }}
      camera={{ position: [25, 30, 25], fov: 45, near: 0.1, far: 300 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
    >
      {/* Light Theme Environment Settings */}
      <color attach="background" args={['#f1f5f9']} />
      <fog attach="fog" args={['#e2e8f0', 25, 95]} />

      {/* Sun/Daylight */}
      <ambientLight intensity={0.65} color="#e0ebff" />
      <directionalLight
        position={[25, 35, 15]}
        intensity={1.5}
        color="#fffaf0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-near={0.5}
        shadow-camera-far={90}
      />
      {/* Soft blue secondary sky fill */}
      <directionalLight position={[-20, 20, -15]} intensity={0.4} color="#b3d1ff" />
      
      {/* Hemisphere light for natural ambient bounce */}
      <hemisphereLight args={['#ffffff', '#cbd5e1', 0.55]} />

      {/* Emergency flashing light during earthquake */}
      {(phase === 'EARTHQUAKE' || phase === 'SETTLING') && (
        <pointLight position={[0, 15, 0]} color="#ef4444" intensity={2.5} distance={60} />
      )}

      {/* Camera Controller handles all smooth view transitions */}
      <CameraController
        cameraMode={cameraMode}
        robotPosition={robotPosition}
        robotPath={robotPath}
        phase={phase}
        earthquakeProgress={earthquakeProgress}
        gridSize={gridSize}
      />

      {/* Enable orbit controls only in overview modes */}
      <OrbitControls
        enabled={cameraMode === 'tactical' || cameraMode === 'top-down'}
        target={[0, 1.5, 0]}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={8}
        maxDistance={75}
        enableDamping
        dampingFactor={0.06}
      />

      {/* Ground with roads */}
      <Ground gridSize={gridSize} isShaking={isShaking} />

      {/* City buildings */}
      <Buildings
        buildings={buildings}
        gridSize={gridSize}
        phase={phase}
        earthquakeProgress={earthquakeProgress}
      />

      {/* Debris */}
      <Debris debris={debris} gridSize={gridSize} phase={phase} />

      {/* Survivors */}
      {survivors.map(s => (
        <Survivor key={s.id} data={s} gridSize={gridSize} phase={phase} />
      ))}

      {/* Robot — deploys after earthquake, rescues during RESCUING */}
      {(phase === 'SETTLING' || phase === 'RESCUING' || phase === 'COMPLETE') && (
        <Robot
          position={robotPosition}
          path={robotPath}
          gridSize={gridSize}
          isMoving={isRobotMoving}
        />
      )}

      {/* Emergency landmarks */}
      <Landmarks gridSize={gridSize} phase={phase} />

      {/* Danger zone overlays */}
      <DangerZones buildings={buildings} gridSize={gridSize} phase={phase} />

      {/* Particles (fires, smoke, sparkles) */}
      <ParticleEffects
        phase={phase}
        gridSize={gridSize}
        rescuePosition={rescuePosition}
        buildings={buildings}
      />
    </Canvas>
  )
}

// ── CAMERA CONTROLLER COMPONENT ────────────────────────────────────────

interface CameraControllerProps {
  cameraMode: 'third-person' | 'drone' | 'tactical' | 'top-down' | 'fps' | 'cinematic'
  robotPosition: [number, number, number]
  robotPath: [number, number][]
  phase: string
  earthquakeProgress: number
  gridSize: number
}

function CameraController({
  cameraMode,
  robotPosition,
  robotPath,
  phase,
  earthquakeProgress,
  gridSize,
}: CameraControllerProps) {
  const { camera } = useThree()
  const originalPos = useRef(new THREE.Vector3())
  const hasStoredOriginal = useRef(false)
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const time = useRef(0)

  useFrame((_, delta) => {
    time.current += delta

    const rx = robotPosition[0]
    const ry = robotPosition[1]
    const rz = robotPosition[2]

    const targetPos = new THREE.Vector3()

    // 1. Calculate target position and lookAt target based on cameraMode
    switch (cameraMode) {
      case 'third-person':
        // Behind the shoulder tracking
        targetPos.set(rx - 5, ry + 4.5, rz - 5)
        targetLookAt.current.set(rx, ry + 1.2, rz)
        break

      case 'drone':
        // Floating circle overhead
        const angle = time.current * 0.08
        targetPos.set(Math.sin(angle) * 32, 22, Math.cos(angle) * 32)
        targetLookAt.current.set(0, 1, 0)
        break

      case 'tactical':
        // Standard high isometric view
        targetPos.set(24, 28, 24)
        targetLookAt.current.set(0, 1, 0)
        break

      case 'top-down':
        // Overhead floor map
        targetPos.set(0.01, 38, 0) // offset X slightly to avoid gimbal lock in orbit controls
        targetLookAt.current.set(0, 0, 0)
        break

      case 'fps':
        // First-person look ahead
        targetPos.set(rx, ry + 1.2, rz + 0.3)
        // If there's a path, look ahead along it, else look in Z direction
        if (robotPath.length > 0) {
          const nextIndex = Math.min(2, robotPath.length - 1)
          const nextNode = robotPath[nextIndex]
          const gx = nextNode[0] - gridSize / 2
          const gz = nextNode[1] - gridSize / 2
          targetLookAt.current.set(gx, ry + 1.2, gz)
        } else {
          targetLookAt.current.set(rx, ry + 1.2, rz + 5)
        }
        break

      case 'cinematic':
        // Sweeping orbit tracking the robot
        const sweepAngle = time.current * 0.15
        targetPos.set(
          rx + Math.sin(sweepAngle) * 12,
          ry + 6 + Math.sin(time.current * 0.3) * 3,
          rz + Math.cos(sweepAngle) * 12
        )
        targetLookAt.current.set(rx, ry + 0.8, rz)
        break
    }

    // 2. Camera shake during earthquake, or smooth follow for non-orbit modes
    const useOrbitControls = cameraMode === 'tactical' || cameraMode === 'top-down'

    if (phase === 'EARTHQUAKE') {
      if (!hasStoredOriginal.current) {
        originalPos.current.copy(camera.position)
        hasStoredOriginal.current = true
      }
      const intensity = Math.sin(earthquakeProgress * Math.PI) * 1.6
      camera.position.x += (Math.random() - 0.5) * intensity * 0.25
      camera.position.y += (Math.random() - 0.5) * intensity * 0.12
      camera.position.z += (Math.random() - 0.5) * intensity * 0.25
    } else {
      hasStoredOriginal.current = false
      if (!useOrbitControls) {
        camera.position.lerp(targetPos, Math.min(delta * 4.5, 1))
      } else if (camera.position.lengthSq() < 0.01) {
        camera.position.copy(targetPos)
      }
    }

    if (!useOrbitControls) {
      currentLookAt.current.lerp(targetLookAt.current, Math.min(delta * 4.5, 1))
      camera.lookAt(currentLookAt.current)
    }
  })

  return null
}
