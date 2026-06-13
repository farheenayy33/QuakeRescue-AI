import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface GroundProps {
  gridSize: number
  isShaking: boolean
}

export default function Ground({ gridSize, isShaking }: GroundProps) {
  const groundRef = useRef<THREE.Group>(null)
  const crackRef = useRef<THREE.Group>(null)

  // Shake the ground during earthquake
  useFrame(() => {
    if (groundRef.current && isShaking) {
      const shakeTime = Date.now() * 0.05
      groundRef.current.position.x = Math.sin(shakeTime * 1.5) * 0.15
      groundRef.current.position.z = Math.cos(shakeTime * 1.3) * 0.15
    } else if (groundRef.current) {
      groundRef.current.position.x = 0
      groundRef.current.position.z = 0
    }
  })

  const size = gridSize * 1.15

  // Generate road layout
  const roads = useMemo(() => {
    const r: { pos: [number, number, number]; size: [number, number, number] }[] = []
    const roadWidth = 1.4
    const spacing = gridSize / 4

    // Horizontal roads
    for (let i = 0; i <= 4; i++) {
      r.push({
        pos: [0, 0.015, -gridSize / 2 + i * spacing],
        size: [size, 0.03, roadWidth],
      })
    }
    // Vertical roads
    for (let i = 0; i <= 4; i++) {
      r.push({
        pos: [-gridSize / 2 + i * spacing, 0.015, 0],
        size: [roadWidth, 0.03, size],
      })
    }
    return r
  }, [gridSize, size])

  // Road center dashed lines (yellow) and side borders (white)
  const markings = useMemo(() => {
    const m: { pos: [number, number, number]; size: [number, number, number]; color: string }[] = []
    const spacing = gridSize / 4
    const dashLength = 0.5
    const dashGap = 0.4

    for (let i = 0; i <= 4; i++) {
      // Horizontal road markings
      for (let d = -size / 2; d < size / 2; d += dashLength + dashGap) {
        m.push({
          pos: [d + dashLength / 2, 0.032, -gridSize / 2 + i * spacing],
          size: [dashLength, 0.005, 0.05],
          color: '#eab308', // Yellow center lines
        })
      }
      // Vertical road markings
      for (let d = -size / 2; d < size / 2; d += dashLength + dashGap) {
        m.push({
          pos: [-gridSize / 2 + i * spacing, 0.032, d + dashLength / 2],
          size: [0.05, 0.005, dashLength],
          color: '#eab308',
        })
      }
    }
    return m
  }, [gridSize, size])

  // Grass/Park zones (green rectangles placed in between roads)
  const parkZones = useMemo(() => {
    const p: { pos: [number, number, number]; size: [number, number] }[] = []
    const spacing = gridSize / 4
    const parkSize = spacing - 2.8 // Space between roads

    for (let ix = 0; ix < 4; ix++) {
      for (let iz = 0; iz < 4; iz++) {
        // Skip some zones to place concrete structures or make it look asymmetrical
        if ((ix + iz) % 3 === 0) continue

        const px = -gridSize / 2 + ix * spacing + spacing / 2
        const pz = -gridSize / 2 + iz * spacing + spacing / 2
        p.push({
          pos: [px, 0.02, pz],
          size: [parkSize, parkSize],
        })
      }
    }
    return p
  }, [gridSize])

  // Generate park trees
  const trees = useMemo(() => {
    const t: { pos: [number, number, number]; scale: number }[] = []
    parkZones.forEach(park => {
      const numTrees = 2 + Math.floor(Math.random() * 3)
      for (let i = 0; i < numTrees; i++) {
        const offsetRange = park.size[0] * 0.35
        const ox = (Math.random() - 0.5) * offsetRange
        const oz = (Math.random() - 0.5) * offsetRange
        t.push({
          pos: [park.pos[0] + ox, 0.03, park.pos[2] + oz],
          scale: 0.6 + Math.random() * 0.5,
        })
      }
    })
    return t
  }, [parkZones])

  // Deep fissures (earthquake cracks) that have a glowing orange under-layer (magma / broken conduits)
  const cracks = useMemo(() => {
    const c: { points: THREE.Vector3[]; width: number }[] = []
    for (let i = 0; i < 6; i++) {
      const startX = (Math.random() - 0.5) * gridSize * 0.7
      const startZ = (Math.random() - 0.5) * gridSize * 0.7
      const points: THREE.Vector3[] = [new THREE.Vector3(startX, 0.04, startZ)]
      const segments = 3 + Math.floor(Math.random() * 5)
      for (let s = 0; s < segments; s++) {
        const last = points[points.length - 1]
        const angle = (Math.random() - 0.5) * Math.PI * 0.6 + (i * Math.PI) / 3
        const len = 1.0 + Math.random() * 3
        points.push(
          new THREE.Vector3(
            last.x + Math.cos(angle) * len,
            0.04,
            last.z + Math.sin(angle) * len
          )
        )
      }
      c.push({ points, width: 0.04 + Math.random() * 0.08 })
    }
    return c
  }, [gridSize])

  return (
    <group ref={groundRef}>
      {/* 1. Main light concrete/tile plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color="#e2e8f0"
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      {/* Grid lines overlay for smart city look */}
      <gridHelper args={[size, 40, '#cbd5e1', '#cbd5e1']} position={[0, 0.005, 0]} />

      {/* Outer border trim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[size + 6, size + 6]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
      </mesh>

      {/* 2. Asphalt Roads */}
      {roads.map((road, i) => (
        <mesh key={`road-${i}`} position={road.pos} receiveShadow>
          <boxGeometry args={road.size} />
          <meshStandardMaterial
            color="#334155" // Slate dark road
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* 3. Road Markings */}
      {markings.map((mark, i) => (
        <mesh key={`mark-${i}`} position={mark.pos}>
          <boxGeometry args={mark.size} />
          <meshStandardMaterial color={mark.color} roughness={0.5} />
        </mesh>
      ))}

      {/* 4. Green Park Zones */}
      {parkZones.map((park, i) => (
        <mesh key={`park-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={park.pos} receiveShadow>
          <planeGeometry args={park.size} />
          <meshStandardMaterial
            color="#a7f3d0" // Bright mint green lawn
            roughness={0.95}
          />
        </mesh>
      ))}

      {/* 5. Park Trees (trunk + foliage) */}
      {trees.map((t, i) => (
        <group key={`tree-${i}`} position={t.pos} scale={[t.scale, t.scale, t.scale]}>
          {/* Trunk */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.09, 0.7, 6]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {/* Foliage */}
          <mesh position={[0, 0.85, 0]} castShadow>
            <dodecahedronGeometry args={[0.35, 0]} />
            <meshStandardMaterial color="#059669" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* 7. Street lamps along main roads */}
      {[-gridSize / 2 + gridSize / 4, 0, gridSize / 2 - gridSize / 4].map((px, i) => (
        <group key={`lamp-h-${i}`} position={[px, 0, -gridSize / 2 + 2]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.04, 1.8, 6]} />
            <meshStandardMaterial color="#475569" metalness={0.7} />
          </mesh>
          <mesh position={[0, 1.85, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#fef9c3" />
          </mesh>
          <pointLight position={[0, 1.9, 0]} color="#fef9c3" intensity={0.3} distance={5} />
        </group>
      ))}

      {/* 8. Bridge crossing mid-city */}
      <group position={[0, 0.5, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[size * 0.55, 0.12, 1.6]} />
          <meshStandardMaterial color="#64748b" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[-size * 0.28, -0.35, 0]}>
          <boxGeometry args={[0.2, 0.7, 0.2]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[size * 0.28, -0.35, 0]}>
          <boxGeometry args={[0.2, 0.7, 0.2]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      </group>

      {/* 6. Glowing Lava Fissures (appears on shake) */}
      {isShaking && (
        <group ref={crackRef}>
          {cracks.map((crack, i) => {
            const curve = new THREE.CatmullRomCurve3(crack.points)
            // Render a slightly wider glowing orange bottom crack
            const tubeLavaGeo = new THREE.TubeGeometry(curve, 24, crack.width * 1.4, 4, false)
            // Render a narrower black top lip
            const tubeBorderGeo = new THREE.TubeGeometry(curve, 24, crack.width, 4, false)
            return (
              <group key={`crack-${i}`}>
                {/* Glowing Core */}
                <mesh geometry={tubeLavaGeo} position={[0, -0.01, 0]}>
                  <meshBasicMaterial color="#f97316" />
                </mesh>
                {/* Dark Edges */}
                <mesh geometry={tubeBorderGeo}>
                  <meshStandardMaterial color="#0f172a" roughness={1.0} />
                </mesh>
              </group>
            )
          })}
        </group>
      )}
    </group>
  )
}
