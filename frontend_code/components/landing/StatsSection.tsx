'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Cpu, Zap, TrendingUp } from 'lucide-react'

export function StatsSection() {
  const [isVisible, setIsVisible] = useState(false)

  const stats = [
    { value: 10000, suffix: '+', label: 'Tons Monitored', icon: TrendingUp },
    { value: 99.2, suffix: '%', label: 'Prediction Accuracy', icon: Cpu },
    { value: 50, suffix: '%', label: 'Loss Reduction', icon: Shield },
    { value: 24, suffix: '/7', label: 'Uptime Guarantee', icon: Zap },
  ]

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.2 }
    )
    const el = document.getElementById('stats-section')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="stats-section"
      className="relative py-12 sm:py-24 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #00a63e 0%, #029238 40%, #016c28 100%)'
      }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '40px 40px',
            width: '100%',
            height: '100%'
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-8 lg:px-12 relative z-10 max-w-7xl">
        {/* Header — compact on mobile */}
        <div className="text-center mb-6 sm:mb-16">
          <h2
            className={`text-2xl sm:text-5xl lg:text-6xl font-black leading-tight text-white transform transition-all duration-1000 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
          >
            Numbers That Matter
          </h2>
        </div>

        {/* Stats — 2x2 grid on mobile, 4-col on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.15 + 0.3, duration: 0.6 }}
              className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-8 text-center hover:bg-white/15 transition-all duration-300 group"
            >
              {/* Icon — smaller on mobile */}
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>

              {/* Counter — smaller on mobile */}
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-1 sm:mb-2">
                {isVisible ? (
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                ) : (
                  <span>0{stat.suffix}</span>
                )}
              </div>

              <p className="text-white/80 font-medium text-xs sm:text-base">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Trust badges — horizontal scroll on mobile */}
        <div 
          className="mt-8 sm:mt-16 flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-2 sm:gap-8 overflow-x-auto pb-2 sm:pb-0 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {['ISO Certified', 'GDPR Compliant', '256-bit Encrypted', 'SOC 2 Ready'].map(
            (badge, i) => (
              <motion.div
                key={badge}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: i * 0.1 + 0.8, duration: 0.4 }}
                className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 flex-shrink-0"
              >
                <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-white/70" />
                <span className="text-xs sm:text-sm font-medium text-white/80 whitespace-nowrap">{badge}</span>
              </motion.div>
            )
          )}
        </div>
      </div>
    </section>
  )
}

// Animated number counter
function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const isDecimal = value % 1 !== 0

  useEffect(() => {
    const duration = 2000
    const startTime = Date.now()

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(eased * value)

      if (progress >= 1) clearInterval(timer)
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  return (
    <span>
      {isDecimal ? count.toFixed(1) : Math.floor(count).toLocaleString()}
      {suffix}
    </span>
  )
}
