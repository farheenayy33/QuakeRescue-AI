import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BuildingData } from './Buildings'

interface ParticleEffectsProps {
  phase: string
  gridSize: number
  rescuePosition?: [number, number, number] | null
  buildings?: BuildingData[]
}

export default function ParticleEffects({ phase, gridSize, rescuePosition, buildings = [] }: ParticleEffectsProps) {
  // Find damaged buildings to spawn fire/smoke points on
  const fireZones = useMemo(() => {
    if (phase === 'IDLE') return []
    return buildings.filter(b => b.damage === 'damaged')
  }, [buildings, phase])

  return (
    <group>
      {/* 1. Ground Dust during Earthquake */}
      {(phase === 'EARTHQUAKE' || phase === 'SETTLING') && (
        <DustCloud gridSize={gridSize} intensity={phase === 'EARTHQUAKE' ? 1.0 : 0.25} />
      )}

      {/* 2. Fire and Smoke at Damaged Buildings */}
      {fireZones.map((building, i) => {
        const worldX = building.x - gridSize / 2 + building.w / 2
        const worldZ = building.y - gridSize / 2 + building.h / 2
        // Spawn fire/smoke slightly above ground/roof level
        const h = building.floors * 0.72
        return (
          <group key={`fire-${i}`} position={[worldX, 0.2, worldZ]}>
            <FireEmitter count={12} width={building.w * 0.6} />
            <SmokeEmitter count={10} height={h} width={building.w * 0.6} />
          </group>
        )
      })}

      {/* 3. Rescue Zone sparkles */}
      {rescuePosition && (
        <RescueSparkles position={rescuePosition} />
      )}
    </group>
  )
}

/* ── DUST CLOUD ── */

function DustCloud({ gridSize, intensity }: { gridSize: number; intensity: number }) {
  const pointsRef = useRef<THREE.Points>(null)
  const count = 200

  const [positions, velocities, lifetimes] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const life = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * gridSize
      pos[i * 3 + 1] = Math.random() * 1.5
      pos[i * 3 + 2] = (Math.random() - 0.5) * gridSize

      vel[i * 3] = (Math.random() - 0.5) * 1.2
      vel[i * 3 + 1] = 0.5 + Math.random() * 0.8
      vel[i * 3 + 2] = (Math.random() - 0.5) * 1.2

      life[i] = Math.random()
    }
    return [pos, vel, life]
  }, [count, gridSize])

  useFrame((_, delta) => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      lifetimes[i] -= delta * 0.35

      if (lifetimes[i] <= 0) {
        posArr[i * 3] = (Math.random() - 0.5) * gridSize
        posArr[i * 3 + 1] = 0.05
        posArr[i * 3 + 2] = (Math.random() - 0.5) * gridSize
        lifetimes[i] = 0.6 + Math.random() * 1.4
      } else {
        posArr[i * 3] += velocities[i * 3] * delta * intensity
        posArr[i * 3 + 1] += velocities[i * 3 + 1] * delta * intensity
        posArr[i * 3 + 2] += velocities[i * 3 + 2] * delta * intensity
      }
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#d1c4e9" // Light chalky lavender/gray
        size={0.18}
        transparent
        opacity={0.32 * intensity}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

/* ── FIRE EMITTER (Flickering orange spheres) ── */

interface EmitterProps {
  count: number
  width: number
}

function FireEmitter({ count, width }: EmitterProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Generate random offsets for flame components
  const fireSpheres = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      offset: [
        (Math.random() - 0.5) * width,
        Math.random() * 0.4,
        (Math.random() - 0.5) * width,
      ] as [number, number, number],
      scale: 0.12 + Math.random() * 0.18,
      speed: 1.5 + Math.random() * 2.0,
      phase: Math.random() * 10,
    }))
  }, [count, width])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime()
    
    groupRef.current.children.forEach((child, i) => {
      const p = fireSpheres[i]
        if (p && child instanceof THREE.Mesh) {
          // Flicker scale and height
        const scale = p.scale * (0.7 + Math.sin(t * p.speed + p.phase) * 0.35)
        child.scale.set(scale, scale * 1.5, scale)
        child.position.y = p.offset[1] + Math.sin(t * p.speed + p.phase) * 0.06
      }
    })
  })

  return (
    <group ref={groupRef}>
      {fireSpheres.map((s, i) => (
        <mesh key={i} position={s.offset}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#f97316' : '#facc15'} />
        </mesh>
      ))}
      {/* Dynamic warm light reflecting on ground */}
      <pointLight color="#f97316" intensity={1.2} distance={5} />
    </group>
  )
}

/* ── SMOKE EMITTER (Translucent rising spheres) ── */

interface SmokeEmitterProps extends EmitterProps {
  height: number
}

function SmokeEmitter({ count, height, width }: SmokeEmitterProps) {
  const groupRef = useRef<THREE.Group>(null)

  const smokePuffs = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      offset: [
        (Math.random() - 0.5) * width,
        Math.random() * height,
        (Math.random() - 0.5) * width,
      ] as [number, number, number],
      scale: 0.25 + Math.random() * 0.3,
      speed: 0.4 + Math.random() * 0.6,
    }))
  }, [count, height, width])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    
    groupRef.current.children.forEach((child, i) => {
      const p = smokePuffs[i]
      if (p && child instanceof THREE.Mesh) {
        child.position.y += delta * p.speed
        child.position.x += Math.sin(child.position.y * 2) * 0.005

        // Expand and fade out as it rises
        const ratio = child.position.y / (height + 2)
        const currentScale = p.scale * (1 + ratio * 1.4)
        child.scale.set(currentScale, currentScale, currentScale)

        const mat = child.material as THREE.MeshStandardMaterial
        mat.opacity = Math.max(0, 0.22 * (1 - ratio))

        // Reset to bottom
        if (child.position.y > height + 2) {
          child.position.y = 0.1
          child.position.x = p.offset[0]
        }
      }
    })
  })

  return (
    <group ref={groupRef}>
      {smokePuffs.map((s, i) => (
        <mesh key={i} position={s.offset} castShadow>
          <sphereGeometry args={[1, 7, 7]} />
          <meshStandardMaterial color="#475569" transparent opacity={0.25} roughness={0.9} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ── RESCUE SPARKLES (Celebration electric ring) ── */

function RescueSparkles({ position }: { position: [number, number, number] }) {
  const particlesRef = useRef<THREE.Points>(null)
  const count = 35
  const timeRef = useRef(0)

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const speed = 1.2 + Math.random() * 2.5
      pos[i * 3] = position[0]
      pos[i * 3 + 1] = position[1] + 0.35
      pos[i * 3 + 2] = position[2]

      vel[i * 3] = Math.cos(angle) * speed
      vel[i * 3 + 1] = 2.5 + Math.random() * 2.5
      vel[i * 3 + 2] = Math.sin(angle) * speed
    }
    return [pos, vel]
  }, [position, count])

  useFrame((_, delta) => {
    timeRef.current += delta
    if (!particlesRef.current || timeRef.current > 1.8) return

    const posAttr = particlesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      posArr[i * 3] += velocities[i * 3] * delta
      // Upwards motion with gravity pull
      posArr[i * 3 + 1] += velocities[i * 3 + 1] * delta - 4.5 * delta * timeRef.current
      posArr[i * 3 + 2] += velocities[i * 3 + 2] * delta
    }
    posAttr.needsUpdate = true

    const mat = particlesRef.current.material as THREE.PointsMaterial
    mat.opacity = Math.max(0, 1 - timeRef.current / 1.8)
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#3b82f6" // Electric blue sparkles
        size={0.16}
        transparent
        opacity={1}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
