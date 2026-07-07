"use client"

import React, { useState, useEffect, useCallback } from "react"
import { X, Crown, Sparkles, PartyPopper } from "lucide-react"

interface WelcomeNotificationProps {
  userName: string
  planName: string
  onDismiss: () => void
}

// Confetti particle
interface Particle {
  id: number
  x: number
  y: number
  color: string
  size: number
  speedX: number
  speedY: number
  rotation: number
  rotationSpeed: number
}

const COLORS = ["#16a34a", "#facc15", "#2563eb", "#dc2626", "#a855f7", "#f97316", "#14b8a6"]

export function WelcomeNotification({ userName, planName, onDismiss }: WelcomeNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])

  const generateParticles = useCallback(() => {
    const newParticles: Particle[] = []
    for (let i = 0; i < 60; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 8,
        speedX: (Math.random() - 0.5) * 3,
        speedY: 1 + Math.random() * 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      })
    }
    setParticles(newParticles)
  }, [])

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100)
    generateParticles()

    // Auto-dismiss after 8 seconds
    const dismissTimer = setTimeout(() => {
      handleDismiss()
    }, 8000)

    return () => {
      clearTimeout(timer)
      clearTimeout(dismissTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return

    const interval = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.speedX * 0.3,
            y: p.y + p.speedY * 0.5,
            rotation: p.rotation + p.rotationSpeed,
            speedY: p.speedY + 0.02, // gravity
          }))
          .filter(p => p.y < 120) // remove off-screen
      )
    }, 30)

    return () => clearInterval(interval)
  }, [particles.length])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 300)
  }

  const displayPlanName = planName === "basic" ? "Starter" :
    planName === "standard" ? "Professional" :
    planName === "professional" ? "Enterprise" :
    planName === "intermediate" ? "Professional" :
    planName === "pro" ? "Enterprise" :
    planName || "Starter"

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              transform: `rotate(${p.rotation}deg)`,
              borderRadius: p.id % 3 === 0 ? "50%" : "2px",
              transition: "none",
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div className={`relative bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'}`}>
        {/* Top gradient bar */}
        <div className="h-2 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />

        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="px-8 py-10 text-center">
          {/* Icon */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute w-20 h-20 rounded-full bg-green-100 animate-ping opacity-20" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-200">
              <PartyPopper className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            🎉 Welcome to GrainHero!
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Hello <span className="font-semibold text-green-700">{userName}</span>, your account is ready!
          </p>

          {/* Plan Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full px-6 py-3 mb-6">
            <Crown className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Your Plan:</span>
            <span className="text-sm font-bold text-green-700">{displayPlanName}</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>

          {/* Info */}
          <p className="text-sm text-gray-500 mb-6">
            Your subscription is now active. Explore your dashboard to manage grain storage, monitor IoT sensors, and leverage AI predictions.
          </p>

          {/* CTA */}
          <button
            onClick={handleDismiss}
            className="w-full py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg shadow-green-200 hover:shadow-xl hover:shadow-green-300"
          >
            Let&apos;s Get Started! 🚀
          </button>
        </div>
      </div>
    </div>
  )
}
