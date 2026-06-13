import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface RobotProps {
  position: [number, number, number]
  path: [number, number][]
  gridSize: number
  isMoving: boolean
}

export default function Robot({ position, path, gridSize, isMoving }: RobotProps) {
  const groupRef = useRef<THREE.Group>(null)
  const turretRef = useRef<THREE.Group>(null)
  const armRef = useRef<THREE.Group>(null)
  const scannerConeRef = useRef<THREE.Mesh>(null)
  const leftTrackRef = useRef<THREE.Mesh>(null)
  const rightTrackRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)

  // Smooth position interpolation
  const targetPos = useMemo(() => new THREE.Vector3(position[0], position[1], position[2]), [position])
  const currentPos = useRef(new THREE.Vector3(position[0], position[1], position[2]))
  const lastPos = useRef(new THREE.Vector3(position[0], position[1], position[2]))

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    if (!groupRef.current) return

    // Interpolate position smoothly
    currentPos.current.lerp(targetPos, Math.min(delta * 8, 1))
    groupRef.current.position.copy(currentPos.current)

    // Calculate heading direction
    const movementDir = new THREE.Vector3().subVectors(currentPos.current, lastPos.current)
    if (movementDir.lengthSq() > 0.0001) {
      const angle = Math.atan2(-movementDir.z, movementDir.x)
      // Smoothly rotate chassis to face heading
      const currentRot = groupRef.current.rotation.y
      const diff = angle - currentRot
      const wrappedDiff = Math.atan2(Math.sin(diff), Math.cos(diff))
      groupRef.current.rotation.y += wrappedDiff * Math.min(delta * 10, 1)
    }
    lastPos.current.copy(currentPos.current)

    // Chassis bobting idle animation
    groupRef.current.position.y = 0.06 + Math.sin(t * 4.5) * 0.025

    // Sweeping scanner arm & light cone animation
    if (armRef.current && scannerConeRef.current) {
      const sweep = Math.sin(t * 3.5) * 0.45
      armRef.current.rotation.y = sweep
      // Pulsing laser scan transparency
      const mat = scannerConeRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.12 + Math.sin(t * 8) * 0.05
    }

    // Spin tracks when moving
    if (isMoving && leftTrackRef.current && rightTrackRef.current) {
      leftTrackRef.current.rotation.x = t * 6
      rightTrackRef.current.rotation.x = t * 6
    }
  })

  // Convert grid path to 3D points
  const pathLines = useMemo(() => {
    if (path.length <= 1) return []
    const lines: { pos: [number, number, number]; rot: [number, number, number]; length: number }[] = []
    
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i]
      const p2 = path[i + 1]
      const x1 = p1[0] - gridSize / 2
      const z1 = p1[1] - gridSize / 2
      const x2 = p2[0] - gridSize / 2
      const z2 = p2[1] - gridSize / 2

      const dx = x2 - x1
      const dz = z2 - z1
      const dist = Math.sqrt(dx * dx + dz * dz)
      const angle = Math.atan2(dx, dz)

      lines.push({
        pos: [x1 + dx / 2, 0.07, z1 + dz / 2],
        rot: [Math.PI / 2, 0, angle],
        length: dist,
      })
    }
    return lines
  }, [path, gridSize])

  return (
    <group>
      {/* ── ANIMATED NEON PATH VISUALIZATION ── */}
      {pathLines.map((line, i) => (
        <PathSegment key={`path-${i}`} line={line} index={i} isMoving={isMoving} />
      ))}

      {/* Path Waypoints with pulsing glow */}
      {path.map(([gx, gz], i) => (
        <PathWaypoint key={`node-${i}`} position={[gx - gridSize / 2, 0.08, gz - gridSize / 2]} index={i} />
      ))}

      {/* ── ROBOT MODEL ── */}
      <group ref={groupRef}>
        
        {/* Track Chassis (Dark slate base frame) */}
        <mesh position={[0, 0.16, 0]} castShadow>
          <boxGeometry args={[0.72, 0.18, 0.82]} />
          <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.6} />
        </mesh>

        {/* Tracks wheels */}
        <group position={[-0.38, 0.12, 0]}>
          <mesh ref={leftTrackRef} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.14, 10]} />
            <meshStandardMaterial color="#1e293b" roughness={0.9} />
          </mesh>
          {/* Track belt */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.13, 0.02, 6, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={1.0} />
          </mesh>
        </group>

        <group position={[0.38, 0.12, 0]}>
          <mesh ref={rightTrackRef} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.14, 10]} />
            <meshStandardMaterial color="#1e293b" roughness={0.9} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.13, 0.02, 6, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={1.0} />
          </mesh>
        </group>

        {/* Turret Body (Amber/Orange industrial shield casing) */}
        <group ref={turretRef} position={[0, 0.38, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.35, 0.58]} />
            <meshStandardMaterial color="#ea580c" roughness={0.35} metalness={0.4} />
          </mesh>

          {/* Stencil decals */}
          <mesh position={[0, 0.1, 0.295]}>
            <planeGeometry args={[0.4, 0.08]} />
            <meshStandardMaterial color="#fef08a" emissive="#ca8a04" emissiveIntensity={0.2} />
          </mesh>

          {/* Blinking beacon emergency strobe light */}
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.08, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.26, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          <pointLight position={[0, 0.28, 0]} color="#ef4444" intensity={0.6} distance={3.5} />

          {/* ── ARTICULATED SCANNER ARM ── */}
          <group ref={armRef} position={[0, 0.14, 0.22]}>
            {/* Extended mechanical armature link */}
            <mesh position={[0, 0.05, 0.1]} rotation={[0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.08, 0.06, 0.25]} />
              <meshStandardMaterial color="#475569" metalness={0.5} />
            </mesh>
            {/* Scanner Head Node */}
            <mesh position={[0, 0.08, 0.22]} castShadow>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshStandardMaterial color="#1e293b" metalness={0.6} />
            </mesh>
            {/* Glowing Sensor Lens */}
            <mesh position={[0, 0.08, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.02, 8]} />
              <meshBasicMaterial color="#06b6d4" />
            </mesh>
            <pointLight position={[0, 0.08, 0.32]} color="#06b6d4" intensity={0.8} distance={4} />

            {/* Glowing Sweeping Laser Scanning Cone */}
            <mesh ref={scannerConeRef} position={[0, -0.4, 1.2]} rotation={[Math.PI / 2.3, 0, 0]}>
              <coneGeometry args={[0.75, 2.2, 8, 1, true]} />
              <meshBasicMaterial color="#06b6d4" transparent opacity={0.15} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}

function PathSegment({
  line,
  index,
  isMoving,
}: {
  line: { pos: [number, number, number]; rot: [number, number, number]; length: number }
  index: number
  isMoving: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const arrowRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.45 + Math.sin(t * 4 + index * 0.8) * 0.25
    }
    if (arrowRef.current) {
      const flow = ((t * 1.8 + index * 0.35) % 1) * line.length - line.length / 2
      arrowRef.current.position.set(0, 0.06, flow)
      arrowRef.current.visible = isMoving
    }
  })

  return (
    <group position={line.pos} rotation={line.rot}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.05, 0.05, line.length, 8]} />
        <meshBasicMaterial color="#2563eb" transparent opacity={0.65} />
      </mesh>
      <mesh ref={arrowRef} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.09, 0.18, 6]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

function PathWaypoint({ position, index }: { position: [number, number, number]; index: number }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.getElapsedTime()
    const scale = 1 + Math.sin(t * 3 + index) * 0.2
    ref.current.scale.set(scale, scale, scale)
  })

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshBasicMaterial color="#06b6d4" transparent opacity={0.85} />
    </mesh>
  )
}
