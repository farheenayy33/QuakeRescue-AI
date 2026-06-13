import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BuildingData } from './Buildings'

interface DangerZonesProps {
  buildings: BuildingData[]
  gridSize: number
  phase: string
}

export default function DangerZones({ buildings, gridSize, phase }: DangerZonesProps) {
  const dangerBuildings = useMemo(
    () => buildings.filter(b => b.damage === 'collapsed' || b.damage === 'damaged'),
    [buildings]
  )

  if (phase === 'IDLE') return null

  return (
    <group>
      {dangerBuildings.map((b, i) => (
        <DangerZone key={i} building={b} gridSize={gridSize} isCollapsed={b.damage === 'collapsed'} />
      ))}
    </group>
  )
}

function DangerZone({
  building,
  gridSize,
  isCollapsed,
}: {
  building: BuildingData
  gridSize: number
  isCollapsed: boolean
}) {
  const overlayRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)

  const worldX = building.x - gridSize / 2 + building.w / 2
  const worldZ = building.y - gridSize / 2 + building.h / 2
  const width = building.w * 0.95
  const depth = building.h * 0.95

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    if (overlayRef.current) {
      const mat = overlayRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = (isCollapsed ? 0.22 : 0.12) + Math.sin(t * 2.5) * 0.06
    }
    if (ringRef.current) {
      const scale = 1 + Math.sin(t * 3) * 0.08
      ringRef.current.scale.set(scale, scale, scale)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.35 + Math.sin(t * 3) * 0.2
    }
  })

  return (
    <group position={[worldX, 0.04, worldZ]}>
      <mesh ref={overlayRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color={isCollapsed ? '#ef4444' : '#f97316'} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[Math.max(width, depth) * 0.45, Math.max(width, depth) * 0.52, 32]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}
