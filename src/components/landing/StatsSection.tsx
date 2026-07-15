

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
      className="relative py-10 sm:py-16 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #2FAC0C 0%, #2FAC0C 40%, #252d26 100%)'
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
        {/* Header */}
        <div className="text-center mb-6 sm:mb-10">
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
              {/* Icon */}
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>

              {/* Counter */}
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
      </div>
    </section>
  )
}

// Animated number counter
function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const isDecimal = value % 1 !== 0

  useEffect(() => {
    const duration = 4000
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

