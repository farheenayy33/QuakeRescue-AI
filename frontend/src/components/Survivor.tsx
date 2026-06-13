import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

export interface SurvivorData {
  id: number
  x: number
  y: number
  rescued: boolean
  state?: 'critical' | 'injured' | 'trapped' | 'stable'
}

interface SurvivorProps {
  data: SurvivorData
  gridSize: number
  phase: string
}

export default function Survivor({ data, gridSize, phase }: SurvivorProps) {
  const groupRef = useRef<THREE.Group>(null)
  const armRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(Math.random() * 8)

  const worldX = data.x - gridSize / 2
  const worldZ = data.y - gridSize / 2

  // Determine health details based on civilian state
  const civState = data.state || 'trapped'
  const healthPercent = data.rescued
    ? 100
    : civState === 'critical'
    ? 22
    : civState === 'injured'
    ? 55
    : 80

  const stateLabel = data.rescued
    ? 'secured'
    : civState === 'critical'
    ? 'critical'
    : civState === 'injured'
    ? 'injured'
    : 'trapped'

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    if (!groupRef.current) return
    if (phase === 'IDLE' || phase === 'EARTHQUAKE') return

    // Rescued transition: floats upwards and shrinks
    if (data.rescued) {
      groupRef.current.position.y += delta * 1.5
      groupRef.current.scale.multiplyScalar(0.96)
      return
    }

    // Waving / signaling hand animation
    if (armRef.current) {
      if (civState === 'critical') {
        // Critical: weak flutter wave on the ground
        armRef.current.rotation.z = Math.sin(t * 2) * 0.15
      } else {
        // Injured/Trapped: active SOS wave
        armRef.current.rotation.z = Math.sin(t * 5) * 0.5 + 0.8
      }
    }

    // Pulse distress ring
    if (ringRef.current) {
      const pulseScale = 1 + Math.sin(t * 3.5) * 0.25
      ringRef.current.scale.set(pulseScale, pulseScale, pulseScale)
      const mat = ringRef.current.material as THREE.MeshStandardMaterial
      mat.opacity = 0.35 + Math.sin(t * 3.5) * 0.25
    }

    // Subtle breathing/floating bob
    groupRef.current.position.y = -0.12 + Math.sin(t * 1.8) * 0.015
  })

  if (phase === 'IDLE' || phase === 'EARTHQUAKE') return null

  // Procedural skin and clothing variety
  const skinColors = ['#fbcfe8', '#fed7aa', '#fde68a', '#fbcfe8', '#fed7aa']
  const shirtColors = ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#7c3aed']
  const skinColor = skinColors[data.id % skinColors.length]
  const shirtColor = shirtColors[data.id % shirtColors.length]

  return (
    <group ref={groupRef} position={[worldX, -0.12, worldZ]}>
      {/* Rubble pile trapping civilian */}
      {!data.rescued && (
        <group position={[0, 0, 0]}>
          <mesh position={[0.15, 0.06, 0.1]} rotation={[0.2, 0.5, 0.1]} castShadow>
            <boxGeometry args={[0.35, 0.1, 0.28]} />
            <meshStandardMaterial color="#64748b" roughness={0.95} />
          </mesh>
          <mesh position={[-0.12, 0.04, -0.08]} rotation={[0.1, -0.3, 0.2]} castShadow>
            <boxGeometry args={[0.22, 0.08, 0.2]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[0, 0.8, 0]}>
            <boxGeometry args={[0.18, 0.06, 0.15]} />
            <meshStandardMaterial color="#78716c" roughness={0.85} />
          </mesh>
        </group>
      )}
      
      {/* ── 3D CIVILIAN CHARACTER MODELS WITH POSTURES ── */}

      {civState === 'critical' ? (
        // CRITICAL POSTURE: Laying flat on ground
        <group rotation={[Math.PI / 2.2, 0, Math.PI / 4]} position={[0, 0.08, 0]}>
          {/* Torso */}
          <mesh castShadow>
            <cylinderGeometry args={[0.09, 0.11, 0.32, 6]} />
            <meshStandardMaterial color={shirtColor} roughness={0.7} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.24, 0]} castShadow>
            <sphereGeometry args={[0.11, 10, 10]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
          {/* Weak Waving Arm */}
          <group ref={armRef} position={[0.13, 0.1, 0]}>
            <mesh>
              <cylinderGeometry args={[0.025, 0.025, 0.18, 5]} />
              <meshStandardMaterial color={skinColor} />
            </mesh>
          </group>
        </group>
      ) : civState === 'injured' ? (
        // INJURED POSTURE: Sitting slumped forward
        <group rotation={[0.2, Math.PI, 0]} position={[0, 0.08, 0]}>
          {/* Slouched Torso */}
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.13, 0.32, 8]} />
            <meshStandardMaterial color={shirtColor} roughness={0.7} />
          </mesh>
          {/* Slumped Head */}
          <mesh position={[0, 0.22, 0.06]} castShadow>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
          {/* Arm waving for rescue */}
          <group ref={armRef} position={[0.15, 0.1, 0]} rotation={[0, 0, 0.4]}>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.18, 5]} />
              <meshStandardMaterial color={skinColor} />
            </mesh>
          </group>
        </group>
      ) : (
        // TRAPPED POSTURE: Cowering/shielding posture
        <group rotation={[0, Math.PI / 2, 0]} position={[0, 0.05, 0]}>
          {/* Torso */}
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.28, 8]} />
            <meshStandardMaterial color={shirtColor} roughness={0.7} />
          </mesh>
          {/* Head cowering */}
          <mesh position={[-0.04, 0.18, 0]} castShadow>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
          {/* Arm shielding head */}
          <group ref={armRef} position={[0.12, 0.08, 0.05]}>
            <mesh position={[0, 0.08, 0]} rotation={[0, 0, 1.1]}>
              <cylinderGeometry args={[0.024, 0.024, 0.2, 5]} />
              <meshStandardMaterial color={skinColor} />
            </mesh>
          </group>
        </group>
      )}

      {/* ── GLOWING DISTRESS RADAR RING ── */}
      {!data.rescued && (
        <mesh ref={ringRef} position={[0, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18, 0.015, 6, 20]} />
          <meshBasicMaterial
            color={civState === 'critical' ? '#ef4444' : civState === 'injured' ? '#f97316' : '#eab308'}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* ── INTUITIVE HTML FLOATING BILLBOARD ── */}
      <Html position={[0, 1.15, 0]} center distanceFactor={15}>
        <div className="civilian-health-billboard">
          <span className={`civilian-tag ${stateLabel}`}>
            {data.rescued ? 'SECURED' : `${stateLabel} #${data.id}`}
          </span>
          <div className="civilian-health-bar">
            <div
              className={`civilian-health-fill ${stateLabel}`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>
      </Html>

      {/* Static Point Light to highlight the survivor */}
      {!data.rescued && (
        <pointLight
          position={[0, 0.6, 0]}
          color={civState === 'critical' ? '#ef4444' : '#f59e0b'}
          intensity={0.6}
          distance={3.5}
        />
      )}

    </group>
  )
}
