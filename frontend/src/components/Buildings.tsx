import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface BuildingData {
  x: number
  y: number
  w: number
  h: number
  floors: number
  damage: 'intact' | 'damaged' | 'collapsed'
  color: string
}

interface BuildingsProps {
  buildings: BuildingData[]
  gridSize: number
  phase: string
  earthquakeProgress: number
}

export default function Buildings({ buildings, gridSize, phase, earthquakeProgress }: BuildingsProps) {
  return (
    <group>
      {buildings.map((b, i) => (
        <Building
          key={i}
          data={b}
          index={i}
          gridSize={gridSize}
          phase={phase}
          earthquakeProgress={earthquakeProgress}
        />
      ))}
    </group>
  )
}

interface BuildingProps {
  data: BuildingData
  index: number
  gridSize: number
  phase: string
  earthquakeProgress: number
}

function Building({ data, index, gridSize, phase, earthquakeProgress }: BuildingProps) {
  const groupRef = useRef<THREE.Group>(null)
  const collapseDelay = useMemo(() => 0.05 + (index % 5) * 0.12, [index])
  const collapseDir = useMemo(() => ((index % 2 === 0 ? 1 : -1) * (0.6 + (index % 3) * 0.2)), [index])
  const collapseAxis = useMemo(() => (index % 3 === 0 ? 'x' : 'z'), [index])

  // Map grid coordinate to 3D coordinate space
  const worldX = data.x - gridSize / 2 + data.w / 2
  const worldZ = data.y - gridSize / 2 + data.h / 2
  const height = data.floors * 0.72
  const width = data.w * 0.82
  const depth = data.h * 0.82

  // Determine Architectural Style
  // 0: Corporate Glass Skyscraper
  // 1: Municipal Emergency Hospital
  // 2: Residential Brick Block
  // 3: Smart Office with Green Trims
  const archStyle = index % 5

  // Windows array
  const windows = useMemo(() => {
    const wins: { pos: [number, number, number]; scale: [number, number]; lit: boolean }[] = []
    const floorHeight = 0.65
    const numFloors = Math.floor(height / floorHeight)

    for (let f = 0; f < numFloors; f++) {
      const wy = f * floorHeight + 0.35
      // Front and Back faces
      const countX = Math.floor(width / 0.5) - 1
      for (let wi = 0; wi < countX; wi++) {
        const wx = -width / 2 + (wi + 1) * (width / (countX + 1))
        wins.push({ pos: [wx, wy, depth / 2 + 0.015], scale: [0.2, 0.28], lit: Math.random() > 0.45 })
        wins.push({ pos: [wx, wy, -depth / 2 - 0.015], scale: [0.2, 0.28], lit: Math.random() > 0.45 })
      }
      // Left and Right faces
      const countZ = Math.floor(depth / 0.5) - 1
      for (let wi = 0; wi < countZ; wi++) {
        const wz = -depth / 2 + (wi + 1) * (depth / (countZ + 1))
        wins.push({ pos: [width / 2 + 0.015, wy, wz], scale: [0.2, 0.28], lit: Math.random() > 0.45 })
        wins.push({ pos: [-width / 2 - 0.015, wy, wz], scale: [0.2, 0.28], lit: Math.random() > 0.45 })
      }
    }
    return wins
  }, [height, width, depth])

  // Rooftop mechanical units
  const rooftopGear = useMemo(() => {
    const gear: { type: 'hvac' | 'antenna' | 'watertower'; pos: [number, number, number] }[] = []
    if (Math.random() > 0.3) {
      gear.push({ type: 'hvac', pos: [(Math.random() - 0.5) * width * 0.4, height + 0.15, (Math.random() - 0.5) * depth * 0.4] })
    }
    if (Math.random() > 0.4) {
      gear.push({ type: 'antenna', pos: [(Math.random() - 0.5) * width * 0.3, height + 0.4, (Math.random() - 0.5) * depth * 0.3] })
    }
    if (archStyle === 2 && Math.random() > 0.5) {
      gear.push({ type: 'watertower', pos: [0, height + 0.3, 0] })
    }
    return gear
  }, [width, depth, height, archStyle])

  useFrame(() => {
    if (!groupRef.current) return

    if (phase === 'EARTHQUAKE' || phase === 'SETTLING') {
      const progress = Math.max(0, earthquakeProgress - collapseDelay) / (1 - collapseDelay)

      if (data.damage === 'collapsed' && progress > 0) {
        const t = Math.min(progress * 1.6, 1)
        const ease = t * t // Accelerating collapse
        
        if (collapseAxis === 'x') {
          groupRef.current.rotation.x = collapseDir * ease * (Math.PI / 4.5)
        } else {
          groupRef.current.rotation.z = collapseDir * ease * (Math.PI / 4.5)
        }
        // Sink building into ground
        groupRef.current.position.y = -ease * height * 0.52
        // Flatten building
        groupRef.current.scale.y = Math.max(0.12, 1 - ease * 0.68)
        groupRef.current.scale.x = 1 + ease * 0.15
        groupRef.current.scale.z = 1 + ease * 0.15
      } else if (data.damage === 'damaged' && progress > 0) {
        const t = Math.min(progress * 1.3, 1)
        // Damaged buildings tilt slightly and settle offset
        if (collapseAxis === 'x') {
          groupRef.current.rotation.x = collapseDir * t * 0.08
        } else {
          groupRef.current.rotation.z = collapseDir * t * 0.08
        }
        groupRef.current.position.y = -t * 0.22
      }

      // Live jitter shake during earthquake phase
      if (phase === 'EARTHQUAKE') {
        const intensity = 0.06
        groupRef.current.position.x = worldX + (Math.random() - 0.5) * intensity
        groupRef.current.position.z = worldZ + (Math.random() - 0.5) * intensity
      }
    }
  })

  // Hide collapsed buildings once operations begin (they are represented by physical Debris clusters)
  if (data.damage === 'collapsed' && (phase === 'RESCUING' || phase === 'COMPLETE')) {
    return null
  }

  // Render components based on style
  return (
    <group ref={groupRef} position={[worldX, 0, worldZ]}>
      {/* 1. Main Core Structure */}
      {archStyle === 0 && (
        // CORPORATE GLASS TOWER
        <group>
          {/* Inner opaque core */}
          <mesh position={[0, height / 2, 0]} castShadow>
            <boxGeometry args={[width * 0.8, height, depth * 0.8]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
          </mesh>
          {/* Outer glossy glass shell */}
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height * 0.98, depth]} />
            <meshStandardMaterial
              color="#93c5fd" // Cyan-blue tinted glass
              roughness={0.1}
              metalness={0.9}
              transparent
              opacity={0.55}
            />
          </mesh>
        </group>
      )}

      {archStyle === 1 && (
        // HOSPITAL BLOCK (White with panels and medical decals)
        <group>
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#ffffff" roughness={0.55} />
          </mesh>
          {/* Red Cross Billboard on the top edge */}
          {data.damage !== 'collapsed' && (
            <group position={[0, height - 0.1, depth / 2 + 0.025]}>
              {/* White backing panel */}
              <mesh>
                <planeGeometry args={[0.8, 0.8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* Red Cross vertical bar */}
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[0.16, 0.52]} />
                <meshBasicMaterial color="#ef4444" />
              </mesh>
              {/* Red Cross horizontal bar */}
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[0.52, 0.16]} />
                <meshBasicMaterial color="#ef4444" />
              </mesh>
            </group>
          )}
        </group>
      )}

      {archStyle === 2 && (
        // RESIDENTIAL BRICK BLOCK (Brown brick color with decorative roof)
        <group>
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#b45309" roughness={0.8} />
          </mesh>
          {/* Sloped Rooftop (pitched roof) */}
          {data.damage !== 'collapsed' && (
            <mesh position={[0, height + 0.18, 0]} rotation={[0, 0, 0]} castShadow>
              <coneGeometry args={[width * 0.72, 0.45, 4]} />
              <meshStandardMaterial color="#475569" roughness={0.7} />
            </mesh>
          )}
        </group>
      )}

      {archStyle === 3 && (
        // SMART OFFICE (Gray with horizontal panel bands)
        <group>
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#64748b" roughness={0.65} />
          </mesh>
          {Array.from({ length: data.floors }).map((_, f) => (
            <mesh key={`band-${f}`} position={[0, f * 0.72 + 0.36, 0]}>
              <boxGeometry args={[width + 0.03, 0.06, depth + 0.03]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.3} roughness={0.5} />
            </mesh>
          ))}
        </group>
      )}

      {archStyle === 4 && (
        // SCHOOL (Yellow brick with playground flag)
        <group>
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#fde68a" roughness={0.75} />
          </mesh>
          {data.damage !== 'collapsed' && phase === 'IDLE' && (
            <mesh position={[0, height + 0.5, depth / 2 + 0.3]}>
              <boxGeometry args={[0.04, 0.04, 1.2]} />
              <meshStandardMaterial color="#64748b" metalness={0.6} />
            </mesh>
          )}
          {data.damage !== 'collapsed' && (
            <mesh position={[0, height + 0.35, depth / 2 + 0.9]}>
              <boxGeometry args={[0.5, 0.3, 0.02]} />
              <meshBasicMaterial color="#2563eb" />
            </mesh>
          )}
        </group>
      )}

      {/* 2. Window Glass Panes (Lit / Unlit) — skip glass towers & schools */}
      {archStyle !== 0 && archStyle !== 4 && windows.map((win, wi) => (
        <mesh key={`win-${wi}`} position={win.pos}>
          <planeGeometry args={win.scale} />
          <meshStandardMaterial
            color={win.lit && data.damage === 'intact' ? '#fef08a' : '#1e293b'}
            emissive={win.lit && data.damage === 'intact' ? '#eab308' : '#000000'}
            emissiveIntensity={win.lit && data.damage === 'intact' ? 0.75 : 0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* 3. Roof cap trims */}
      <mesh position={[0, height + 0.015, 0]}>
        <boxGeometry args={[width + 0.04, 0.03, depth + 0.04]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* 4. Rooftop Gear details */}
      {data.damage !== 'collapsed' && rooftopGear.map((g, gi) => {
        if (g.type === 'hvac') {
          return (
            <mesh key={`gear-${gi}`} position={g.pos} castShadow>
              <boxGeometry args={[0.42, 0.28, 0.42]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.5} />
            </mesh>
          )
        }
        if (g.type === 'antenna') {
          return (
            <group key={`gear-${gi}`} position={g.pos}>
              <mesh castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.8, 5]} />
                <meshStandardMaterial color="#334155" metalness={0.8} />
              </mesh>
              {/* Flashing warning beacon */}
              <mesh position={[0, 0.42, 0]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color="#ef4444" />
              </mesh>
            </group>
          )
        }
        if (g.type === 'watertower') {
          return (
            <group key={`gear-${gi}`} position={g.pos}>
              {/* Tank */}
              <mesh position={[0, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.22, 0.22, 0.42, 8]} />
                <meshStandardMaterial color="#b45309" roughness={0.8} />
              </mesh>
              {/* Supports */}
              <mesh position={[0.08, -0.05, 0.08]}>
                <cylinderGeometry args={[0.01, 0.01, 0.15, 4]} />
                <meshStandardMaterial color="#475569" />
              </mesh>
              <mesh position={[-0.08, -0.05, 0.08]}>
                <cylinderGeometry args={[0.01, 0.01, 0.15, 4]} />
                <meshStandardMaterial color="#475569" />
              </mesh>
              <mesh position={[0.08, -0.05, -0.08]}>
                <cylinderGeometry args={[0.01, 0.01, 0.15, 4]} />
                <meshStandardMaterial color="#475569" />
              </mesh>
              <mesh position={[-0.08, -0.05, -0.08]}>
                <cylinderGeometry args={[0.01, 0.01, 0.15, 4]} />
                <meshStandardMaterial color="#475569" />
              </mesh>
            </group>
          )
        }
        return null
      })}
    </group>
  )
}
