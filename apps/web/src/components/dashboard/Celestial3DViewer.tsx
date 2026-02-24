import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'

interface Celestial3DViewerProps {
  targetType?: string
  targetName?: string
}

/** Returns a color palette based on the celestial object type. */
function getBodyAppearance(targetType?: string): {
  color: string
  emissive: string
  emissiveIntensity: number
  wireframeColor: string
} {
  const t = (targetType ?? '').toLowerCase()

  if (t.includes('star') || t.includes('sequence') || t.includes('sun')) {
    return {
      color: '#FDB813',
      emissive: '#FF8C00',
      emissiveIntensity: 1.2,
      wireframeColor: '#FFA500',
    }
  }
  if (t.includes('gas giant')) {
    return {
      color: '#C88B3A',
      emissive: '#8B5E3C',
      emissiveIntensity: 0.4,
      wireframeColor: '#D4915E',
    }
  }
  if (t.includes('ice giant')) {
    return {
      color: '#5B9BD5',
      emissive: '#2E5984',
      emissiveIntensity: 0.5,
      wireframeColor: '#7EC8E3',
    }
  }
  if (t.includes('rocky') || t.includes('terrestrial')) {
    return {
      color: '#A0826D',
      emissive: '#5C4033',
      emissiveIntensity: 0.3,
      wireframeColor: '#C4A882',
    }
  }
  if (t.includes('satellite') || t.includes('moon')) {
    return {
      color: '#B0B0B0',
      emissive: '#666666',
      emissiveIntensity: 0.2,
      wireframeColor: '#D0D0D0',
    }
  }
  // Default: theme cyan
  return {
    color: '#00f2ff',
    emissive: '#00f2ff',
    emissiveIntensity: 0.6,
    wireframeColor: '#00f2ff',
  }
}

/** Inner Three.js component — a slowly rotating sphere with a wireframe overlay. */
function RotatingBody({ targetType }: { targetType?: string }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const wireRef = useRef<THREE.Mesh>(null!)
  const appearance = useMemo(() => getBodyAppearance(targetType), [targetType])

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15
    }
    if (wireRef.current) {
      wireRef.current.rotation.y += delta * 0.15
      wireRef.current.rotation.x += delta * 0.05
    }
  })

  return (
    <group>
      {/* Solid body */}
      <Sphere ref={meshRef} args={[1.2, 64, 64]}>
        <meshStandardMaterial
          color={appearance.color}
          emissive={appearance.emissive}
          emissiveIntensity={appearance.emissiveIntensity}
          roughness={0.7}
          metalness={0.3}
        />
      </Sphere>

      {/* Wireframe overlay for sci-fi holo effect */}
      <Sphere ref={wireRef} args={[1.28, 24, 24]}>
        <meshBasicMaterial color={appearance.wireframeColor} wireframe transparent opacity={0.15} />
      </Sphere>

      {/* Glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.55, 64]} />
        <meshBasicMaterial
          color={appearance.wireframeColor}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

/** A 3D celestial body viewer using React Three Fiber. */
export const Celestial3DViewer: React.FC<Celestial3DViewerProps> = ({ targetType, targetName }) => {
  const hasTarget = !!targetName

  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      style={{ background: 'transparent' }}
      gl={{ alpha: true, antialias: true }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-3, -2, 2]} intensity={0.4} color="#00f2ff" />

      {/* Starfield background */}
      <Stars radius={50} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />

      {/* Celestial body */}
      {hasTarget ? (
        <RotatingBody targetType={targetType} />
      ) : (
        <Sphere args={[0.8, 16, 16]}>
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.08} />
        </Sphere>
      )}

      {/* Controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={hasTarget ? 0.5 : 0.2}
      />
    </Canvas>
  )
}
