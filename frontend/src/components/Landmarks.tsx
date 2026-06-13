import { useMemo } from 'react'

interface LandmarksProps {
  gridSize: number
  phase: string
}

export default function Landmarks({ gridSize, phase }: LandmarksProps) {
  const landmarks = useMemo(() => {
    const half = gridSize / 2
    return [
      { type: 'rescue', pos: [-half + 2, 0, -half + 2] as [number, number, number], label: 'Rescue Station' },
      { type: 'emergency', pos: [half - 3, 0, -half + 2] as [number, number, number], label: 'Emergency Center' },
      { type: 'hospital', pos: [-half + 2, 0, half - 3] as [number, number, number], label: 'Field Hospital' },
    ]
  }, [gridSize])

  if (phase === 'IDLE') return null

  return (
    <group>
      {landmarks.map((lm, i) => (
        <group key={i} position={lm.pos}>
          {lm.type === 'rescue' && (
            <group>
              <mesh position={[0, 0.35, 0]} castShadow>
                <boxGeometry args={[1.2, 0.7, 1.2]} />
                <meshStandardMaterial color="#2563eb" roughness={0.4} metalness={0.3} />
              </mesh>
              <mesh position={[0, 0.85, 0]}>
                <boxGeometry args={[0.9, 0.08, 0.9]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0, 0.85, 0.46]}>
                <planeGeometry args={[0.5, 0.5]} />
                <meshBasicMaterial color="#2563eb" />
              </mesh>
            </group>
          )}
          {lm.type === 'emergency' && (
            <group>
              <mesh position={[0, 0.4, 0]} castShadow>
                <cylinderGeometry args={[0.7, 0.8, 0.8, 6]} />
                <meshStandardMaterial color="#ffffff" roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.9, 0]}>
                <coneGeometry args={[0.55, 0.35, 4]} />
                <meshStandardMaterial color="#ef4444" roughness={0.6} />
              </mesh>
            </group>
          )}
          {lm.type === 'hospital' && (
            <group>
              <mesh position={[0, 0.3, 0]} castShadow>
                <boxGeometry args={[1.4, 0.6, 1.0]} />
                <meshStandardMaterial color="#ffffff" roughness={0.55} />
              </mesh>
              <mesh position={[0, 0.62, 0.51]}>
                <planeGeometry args={[0.3, 0.3]} />
                <meshBasicMaterial color="#ef4444" />
              </mesh>
              <mesh position={[0, 0.62, 0.52]}>
                <planeGeometry args={[0.1, 0.22]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0, 0.62, 0.52]}>
                <planeGeometry args={[0.22, 0.1]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          )}
          <pointLight
            position={[0, 1.2, 0]}
            color={lm.type === 'rescue' ? '#2563eb' : lm.type === 'emergency' ? '#ef4444' : '#10b981'}
            intensity={0.5}
            distance={6}
          />
        </group>
      ))}
    </group>
  )
}
