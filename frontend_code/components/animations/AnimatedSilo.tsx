// "use client"

// import React, { useRef, useState, useEffect } from 'react'
// import { Canvas, useFrame, useLoader } from '@react-three/fiber'
// import { OrbitControls, Text, Box, Cylinder, Sphere } from '@react-three/drei'
// import { motion } from 'framer-motion'
// import { useSpring, animated } from '@react-spring/web'
// import * as THREE from 'three'

// interface AnimatedSiloProps {
//   fillLevel: number
//   capacity: number
//   grainType: string
//   temperature: number
//   humidity: number
//   status: 'optimal' | 'warning' | 'critical'
//   className?: string
// }

// // 3D Silo Component
// function Silo3D({ fillLevel, grainType, temperature, humidity, status }: Omit<AnimatedSiloProps, 'capacity' | 'className'>) {
//   const meshRef = useRef<THREE.Mesh>(null)
//   const grainRef = useRef<THREE.Mesh>(null)
  
//   // Color based on status
//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'optimal': return '#10B981'
//       case 'warning': return '#F59E0B'
//       case 'critical': return '#EF4444'
//       default: return '#6B7280'
//     }
//   }

//   // Grain color based on type
//   const getGrainColor = (type: string) => {
//     switch (type.toLowerCase()) {
//       case 'wheat': return '#D97706'
//       case 'rice': return '#F3F4F6'
//       case 'corn': return '#FCD34D'
//       case 'barley': return '#92400E'
//       default: return '#D97706'
//     }
//   }

//   useFrame((state) => {
//     if (meshRef.current) {
//       meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
//     }
//     if (grainRef.current) {
//       grainRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05
//     }
//   })

//   return (
//     <group>
//       {/* Silo Structure */}
//       <Cylinder
//         ref={meshRef}
//         args={[1, 1, 3, 32]}
//         position={[0, 0, 0]}
//       >
//         <meshStandardMaterial
//           color="#374151"
//           metalness={0.3}
//           roughness={0.7}
//         />
//       </Cylinder>
      
//       {/* Grain Content */}
//       <Cylinder
//         ref={grainRef}
//         args={[0.9, 0.9, (fillLevel / 100) * 2.8, 32]}
//         position={[0, -1.5 + (fillLevel / 100) * 1.4, 0]}
//       >
//         <meshStandardMaterial
//           color={getGrainColor(grainType)}
//           roughness={0.8}
//         />
//       </Cylinder>
      
//       {/* Temperature Indicator */}
//       <Sphere
//         position={[1.2, 1, 0]}
//         args={[0.1, 8, 8]}
//       >
//         <meshStandardMaterial
//           color={temperature > 25 ? '#EF4444' : temperature > 20 ? '#F59E0B' : '#10B981'}
//           emissive={temperature > 25 ? '#FF0000' : temperature > 20 ? '#FFA500' : '#00FF00'}
//           emissiveIntensity={0.3}
//         />
//       </Sphere>
      
//       {/* Status Ring */}
//       <Cylinder
//         args={[1.05, 1.05, 0.1, 32]}
//         position={[0, 1.45, 0]}
//       >
//         <meshStandardMaterial
//           color={getStatusColor(status)}
//           emissive={getStatusColor(status)}
//           emissiveIntensity={0.2}
//         />
//       </Cylinder>
      
//       {/* Labels */}
//       <Text
//         position={[0, -2.2, 0]}
//         fontSize={0.2}
//         color="white"
//         anchorX="center"
//         anchorY="middle"
//       >
//         {grainType}
//       </Text>
      
//       <Text
//         position={[0, 2.2, 0]}
//         fontSize={0.15}
//         color="white"
//         anchorX="center"
//         anchorY="middle"
//       >
//         {fillLevel}%
//       </Text>
//     </group>
//   )
// }

// // Main Animated Silo Component
// export function AnimatedSilo({ 
//   fillLevel, 
//   capacity, 
//   grainType, 
//   temperature, 
//   humidity, 
//   status,
//   className = ""
// }: AnimatedSiloProps) {
//   const [isHovered, setIsHovered] = useState(false)
//   const [isVisible, setIsVisible] = useState(false)
  
//   // Spring animations
//   const { scale, opacity } = useSpring({
//     scale: isHovered ? 1.1 : 1,
//     opacity: isVisible ? 1 : 0,
//     config: { tension: 300, friction: 30 }
//   })

//   const fillAnimation = useSpring({
//     from: { height: 0 },
//     to: { height: fillLevel },
//     config: { tension: 200, friction: 20 }
//   })

//   return (
//     <motion.div
//       className={`relative ${className}`}
//       initial={{ opacity: 0, y: 50 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.6, ease: "easeOut" }}
//       whileHover={{ scale: 1.05 }}
//       onHoverStart={() => setIsHovered(true)}
//       onHoverEnd={() => setIsHovered(false)}
//     >
//       {/* 3D Silo Canvas */}
//       <div className="w-full h-64 bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg overflow-hidden">
//         <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
//           <ambientLight intensity={0.4} />
//           <directionalLight position={[5, 5, 5]} intensity={0.8} />
//           <pointLight position={[-5, 5, 5]} intensity={0.3} />
          
//           <Silo3D
//             fillLevel={fillLevel}
//             grainType={grainType}
//             temperature={temperature}
//             humidity={humidity}
//             status={status}
//           />
          
//           <OrbitControls
//             enablePan={false}
//             enableZoom={false}
//             autoRotate
//             autoRotateSpeed={2}
//           />
//         </Canvas>
//       </div>

//       {/* Overlay Information */}
//       <animated.div
//         className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-between p-4 text-white"
//         style={{ opacity }}
//       >
//         <div className="flex justify-between items-start">
//           <div>
//             <h3 className="text-lg font-semibold">{grainType} Silo</h3>
//             <p className="text-sm opacity-80">Capacity: {capacity.toLocaleString()} kg</p>
//           </div>
//           <div className="text-right">
//             <div className={`px-2 py-1 rounded-full text-xs font-medium ${
//               status === 'optimal' ? 'bg-green-500' :
//               status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
//             }`}>
//               {status.toUpperCase()}
//             </div>
//           </div>
//         </div>

//         <div className="space-y-2">
//           {/* Fill Level Bar */}
//           <div className="space-y-1">
//             <div className="flex justify-between text-sm">
//               <span>Fill Level</span>
//               <span>{fillLevel}%</span>
//             </div>
//             <div className="w-full bg-gray-700 rounded-full h-2">
//               <animated.div
//                 className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600"
//                 style={{
//                   width: fillAnimation.height.to(h => `${h}%`)
//                 }}
//               />
//             </div>
//           </div>

//           {/* Temperature & Humidity */}
//           <div className="grid grid-cols-2 gap-4 text-sm">
//             <div className="flex items-center space-x-2">
//               <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
//               <span>{temperature}°C</span>
//             </div>
//             <div className="flex items-center space-x-2">
//               <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
//               <span>{humidity}%</span>
//             </div>
//           </div>
//         </div>
//       </animated.div>

//       {/* Floating Particles */}
//       <div className="absolute inset-0 pointer-events-none">
//         {[...Array(20)].map((_, i) => (
//           <motion.div
//             key={i}
//             className="absolute w-1 h-1 bg-white rounded-full opacity-30"
//             animate={{
//               x: [0, Math.random() * 100],
//               y: [0, -Math.random() * 100],
//               opacity: [0, 1, 0]
//             }}
//             transition={{
//               duration: Math.random() * 3 + 2,
//               repeat: Infinity,
//               delay: Math.random() * 2
//             }}
//             style={{
//               left: `${Math.random() * 100}%`,
//               top: `${Math.random() * 100}%`
//             }}
//           />
//         ))}
//       </div>
//     </motion.div>
//   )
// }

// // Silo Grid Component
// export function SiloGrid({ silos }: { silos: AnimatedSiloProps[] }) {
//   return (
//     <motion.div
//       className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       transition={{ duration: 0.8 }}
//     >
//       {silos.map((silo, index) => (
//         <motion.div
//           key={index}
//           initial={{ opacity: 0, y: 50 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.6, delay: index * 0.1 }}
//         >
//           <AnimatedSilo {...silo} />
//         </motion.div>
//       ))}
//     </motion.div>
//   )
// }
