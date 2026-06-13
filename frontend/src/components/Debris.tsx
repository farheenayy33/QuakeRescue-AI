import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface DebrisData {
  x: number
  y: number
  size: number
}

interface DebrisProps {
  debris: DebrisData[]
  gridSize: number
  phase: string
}

export default function Debris({ debris, gridSize, phase }: DebrisProps) {
  if (phase === 'IDLE') return null

  return (
    <group>
      {debris.map((d, i) => (
        <DebrisCluster key={i} data={d} index={i} gridSize={gridSize} phase={phase} />
      ))}
    </group>
  )
}

interface DebrisClusterProps {
  data: DebrisData
  index: number
  gridSize: number
  phase: string
}

function DebrisCluster({ data, index, gridSize, phase }: DebrisClusterProps) {
  const groupRef = useRef<THREE.Group>(null)

  const worldX = data.x - gridSize / 2
  const worldZ = data.y - gridSize / 2

  // Generate sub-elements of the debris pile for an organic look
  const clusterItems = useMemo(() => {
    const items: {
      type: 'slab' | 'brick' | 'rebar'
      pos: [number, number, number]
      rot: [number, number, number]
      scale: [number, number, number]
      color: string
    }[] = []

    // 1. Core Concrete Slab
    items.push({
      type: 'slab',
      pos: [0, 0, 0],
      rot: [Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4],
      scale: [0.45 + data.size * 0.4, 0.08 + data.size * 0.08, 0.45 + data.size * 0.4],
      color: ['#94a3b8', '#64748b', '#475569'][index % 3],
    })

    // 2. Fragmented brick/rock chunk
    if (data.size > 0.4) {
      items.push({
        type: 'brick',
        pos: [0.15 + Math.random() * 0.2, 0.04, -0.15 - Math.random() * 0.2],
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        scale: [0.12 + Math.random() * 0.1, 0.1 + Math.random() * 0.1, 0.12 + Math.random() * 0.1],
        color: ['#b45309', '#78350f', '#78716c'][index % 3], // Reddish brick or concrete gray
      })
    }

    // 3. Exposed Rebar Rebar bar (metallic rod)
    if (data.size > 0.6 && index % 2 === 0) {
      items.push({
        type: 'rebar',
        pos: [-0.2, 0.05, 0.2],
        rot: [0.2, Math.random() * 1.5, 0.4],
        scale: [0.015, 0.015, 0.8 + Math.random() * 0.4],
        color: '#475569',
      })
    }

    return items
  }, [data.size, index])

  const fallSpeed = useMemo(() => 8 + Math.random() * 4, [])
  const startY = useRef(3.5 + Math.random() * 2)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    if (phase === 'EARTHQUAKE' || phase === 'SETTLING') {
      if (startY.current > 0.02) {
        // Fall down towards floor level
        startY.current -= delta * fallSpeed
        groupRef.current.position.y = Math.max(0.02, startY.current)
        
        // Spin slightly during drop
        groupRef.current.rotation.y += delta * 1.2
      }
    } else {
      groupRef.current.position.y = 0.02
    }
  })

  return (
    <group ref={groupRef} position={[worldX, startY.current, worldZ]}>
      {clusterItems.map((item, idx) => {
        if (item.type === 'rebar') {
          return (
            <mesh key={idx} position={item.pos} rotation={item.rot} castShadow>
              <cylinderGeometry args={[item.scale[0], item.scale[1], item.scale[2], 5]} />
              <meshStandardMaterial color={item.color} metalness={0.8} roughness={0.4} />
            </mesh>
          )
        }
        return (
          <mesh key={idx} position={item.pos} rotation={item.rot} scale={item.scale} castShadow receiveShadow>
            <boxGeometry />
            <meshStandardMaterial color={item.color} roughness={0.9} metalness={0.1} />
          </mesh>
        )
      })}
    </group>
  )
}
