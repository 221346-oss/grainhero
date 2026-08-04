import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Environment, ContactShadows, Float } from '@react-three/drei'
import type { Group } from 'three'

const GREEN = '#2FA84F'
const LIME = '#A8E6A1'
const CREAM = '#FAFAF7'

const hotspots = [
  { id: 'temp', label: 'Temperature probe', pos: [0.95, 1.15, 0] as const },
  { id: 'hum', label: 'Humidity + CO₂ node', pos: [-0.95, 0.25, 0.2] as const },
  { id: 'fan', label: 'Aeration actuator', pos: [0.7, -0.95, 0.6] as const },
  { id: 'gate', label: 'Discharge gate sensor', pos: [0, -1.45, 0.95] as const },
]

function Silo({ active, setActive }: { active: string | null; setActive: (v: string | null) => void }) {
  const group = useRef<Group>(null)

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    group.current.rotation.y = t * 0.22
    group.current.position.y = Math.sin(t * 0.7) * 0.06
  })

  return (
    <group ref={group}>
      {/* body */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[1, 1, 3, 48]} />
        <meshStandardMaterial color={CREAM} metalness={0.7} roughness={0.32} />
      </mesh>
      {/* corrugation rings */}
      {[-1.2, -0.7, -0.2, 0.3, 0.8, 1.3].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[1.005, 0.028, 10, 60]} />
          <meshStandardMaterial color="#C7D9C1" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      {/* roof */}
      <mesh castShadow position={[0, 1.85, 0]}>
        <coneGeometry args={[1.06, 0.75, 48]} />
        <meshStandardMaterial color={GREEN} metalness={0.4} roughness={0.35} />
      </mesh>
      {/* vent cap */}
      <mesh position={[0, 2.32, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.22, 20]} />
        <meshStandardMaterial color={LIME} emissive={LIME} emissiveIntensity={0.35} />
      </mesh>
      {/* base */}
      <mesh receiveShadow position={[0, -1.62, 0]}>
        <cylinderGeometry args={[1.18, 1.18, 0.24, 48]} />
        <meshStandardMaterial color="#2A342B" metalness={0.2} roughness={0.8} />
      </mesh>

      {hotspots.map((h) => (
        <group key={h.id} position={[h.pos[0], h.pos[1], h.pos[2]]}>
          <mesh
            onPointerOver={(e) => {
              e.stopPropagation()
              setActive(h.id)
            }}
            onPointerOut={() => setActive(null)}
          >
            <sphereGeometry args={[0.09, 20, 20]} />
            <meshStandardMaterial
              color={LIME}
              emissive={LIME}
              emissiveIntensity={active === h.id ? 2.2 : 1.1}
            />
          </mesh>
          <Html center distanceFactor={7} zIndexRange={[10, 0]}>
            <div
              className={`pointer-events-none whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold transition-all duration-200 ${
                active === h.id
                  ? 'bg-[#A8E6A1] text-[#111512] opacity-100'
                  : 'bg-[#111512]/70 text-[#FAFAF7] opacity-0'
              }`}
              style={{ transform: 'translateY(-28px)' }}
            >
              {h.label}
            </div>
          </Html>
        </group>
      ))}
    </group>
  )
}

export default function SiloScene() {
  const [active, setActive] = useState<string | null>(null)
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.6, 6.2], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 4]} intensity={1.5} castShadow />
      <pointLight position={[-4, 1, -3]} intensity={22} color={LIME} distance={12} />
      <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.25}>
        <Silo active={active} setActive={setActive} />
      </Float>
      <ContactShadows position={[0, -1.85, 0]} opacity={0.4} scale={9} blur={2.6} far={4} />
      <Environment preset="sunset" />
    </Canvas>
  )
}