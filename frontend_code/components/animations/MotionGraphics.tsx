"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
//import { useSpring, animated, useTransition } from '@react-spring/web'
//import { useGesture } from '@use-gesture/react'
import { useInView as useIntersectionObserver } from 'react-intersection-observer'
// import { 
//   Sparkles, 
//   Zap, 
//   Activity, 
//   TrendingUp, 
//   Globe, 
//   Shield,
//   Database,
//   Cpu
// } from 'lucide-react'

// Particle System Component
export function ParticleSystem({ count = 50, className = "" }: { count?: number, className?: string }) {
  const [particles, setParticles] = useState<Array<{ id: number, x: number, y: number, vx: number, vy: number }>>([])
  
  useEffect(() => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5
    }))
    setParticles(newParticles)
  }, [count])

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-60"
          animate={{
            x: [particle.x, particle.x + particle.vx * 100],
            y: [particle.y, particle.y + particle.vy * 100],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`
          }}
        />
      ))}
    </div>
  )
}

// Animated Background
export function AnimatedBackground({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <ParticleSystem count={30} />
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
        animate={{
          background: [
            "linear-gradient(45deg, #f0f9ff, #e0e7ff, #faf5ff)",
            "linear-gradient(45deg, #f0fdf4, #fef3c7, #fce7f3)",
            "linear-gradient(45deg, #f0f9ff, #e0e7ff, #faf5ff)"
          ]
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// Floating Elements
export function FloatingElements({ children, intensity = 1 }: { children: React.ReactNode, intensity?: number }) {
  return (
    <motion.div
      animate={{
        y: [0, -10 * intensity, 0],
        rotate: [0, 1 * intensity, 0]
      }}
      transition={{
        duration: 3 + Math.random() * 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  )
}

// Interactive Card with Hover Effects
export function InteractiveCard({ 
  children, 
  className = "",
  hoverScale = 1.05,
  hoverRotate = 2
}: { 
  children: React.ReactNode
  className?: string
  hoverScale?: number
  hoverRotate?: number
}) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        scale: hoverScale, 
        rotate: hoverRotate,
        transition: { duration: 0.3 }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {children}
      
      {/* Hover Glow Effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg opacity-0 blur-xl"
        animate={{
          opacity: isHovered ? 0.3 : 0
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  )
}

// Animated Text with Stagger Effect
export function AnimatedText({ 
  text, 
  className = "",
  delay = 0
}: { 
  text: string
  className?: string
  delay?: number
}) {
  const words = text.split(' ')
  
  return (
    <div className={className}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          className="inline-block mr-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: delay + index * 0.1,
            duration: 0.5
          }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  )
}

// Loading Animation
export function LoadingAnimation({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  }
  
  return (
    <div className="flex justify-center items-center">
      <motion.div
        className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  )
}

// Animated Counter
export function AnimatedCounter({ 
  end, 
  duration = 2,
  className = ""
}: { 
  end: number
  duration?: number
  className?: string
}) {
  const [count, setCount] = useState(0)
  const { ref, inView } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true
  })
  
  useEffect(() => {
    if (inView) {
      const startTime = Date.now()
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / (duration * 1000), 1)
        setCount(Math.floor(progress * end))
        
        if (progress >= 1) {
          clearInterval(timer)
        }
      }, 16)
      
      return () => clearInterval(timer)
    }
  }, [inView, end, duration])
  
  return (
    <span ref={ref} className={className}>
      {count.toLocaleString()}
    </span>
  )
}

// Animated Progress Bar
export function AnimatedProgressBar({ 
  progress, 
  label,
  color = "blue",
  className = ""
}: { 
  progress: number
  label?: string
  color?: string
  className?: string
}) {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    purple: "bg-purple-500"
  }
  
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div
          className={`h-2 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

// Animated Icon Grid
export function AnimatedIconGrid({ 
  icons,
  className = ""
}: { 
  icons: Array<{ icon: React.ComponentType<React.SVGProps<SVGSVGElement>>, label: string, color: string }>
  className?: string
}) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {icons.map((item, index) => (
        <motion.div
          key={index}
          className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            delay: index * 0.1,
            duration: 0.5
          }}
          whileHover={{ 
            scale: 1.1,
            rotate: 5
          }}
        >
          <motion.div
            className={`p-3 rounded-full ${item.color} mb-2`}
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <item.icon className="w-6 h-6 text-white" />
          </motion.div>
          <span className="text-sm font-medium text-gray-700">{item.label}</span>
        </motion.div>
      ))}
    </div>
  )
}

// Animated Section Divider
export function AnimatedDivider({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent ${className}`}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
    />
  )
}

// Animated Feature Grid
export function AnimatedFeatureGrid({ 
  features,
  className = ""
}: { 
  features: Array<{ 
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>, 
    title: string, 
    description: string,
    color: string
  }>
  className?: string
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {features.map((feature, index) => (
        <motion.div
          key={index}
          className="p-6 bg-white rounded-lg shadow-lg"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: index * 0.1,
            duration: 0.6
          }}
          whileHover={{ 
            y: -5,
            transition: { duration: 0.3 }
          }}
        >
          <motion.div
            className={`inline-flex p-3 rounded-full ${feature.color} mb-4`}
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <feature.icon className="w-6 h-6 text-white" />
          </motion.div>
          <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
          <p className="text-gray-600">{feature.description}</p>
        </motion.div>
      ))}
    </div>
  )
}
