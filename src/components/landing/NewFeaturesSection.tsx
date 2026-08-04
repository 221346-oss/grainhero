import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
  Gauge,
  Brain,
  Bell,
  BarChart3,
  Settings,
  Building2,
} from 'lucide-react'

const features = [
  {
    icon: Gauge,
    title: 'Real-Time Monitoring',
    description:
      'Track temperature, humidity, moisture, and CO₂ levels 24/7 with industrial IoT sensors providing second-by-second updates.',
    color: '#2FA84F',
    image: '/images/features/Real_time_monitoring.png',
  },
  {
    icon: Brain,
    title: 'AI Spoilage Prediction',
    description:
      'Machine learning algorithms analyze patterns to predict spoilage 24-48 hours in advance, preventing costly grain losses.',
    color: '#2FA84F',
    image: '/images/features/AI_Spoilage_Prediction.png',
  },
  {
    icon: Bell,
    title: 'Instant Alerts',
    description:
      'Receive immediate notifications via SMS, email, or push when conditions exceed safe thresholds. Never miss a critical event.',
    color: '#2FA84F',
    image: '/images/features/Mobile_Alert_Notification.png',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description:
      'Comprehensive insights with historical data visualization, trend analysis, and automated reports for informed decision-making.',
    color: '#2FA84F',
    image: '/images/features/Analytics_Dashboard.png',
  },
  {
    icon: Settings,
    title: 'Remote Control',
    description:
      'Integrate with ventilation, cooling, and aeration systems for automated climate control based on AI recommendations.',
    color: '#2FA84F',
    image: '/images/features/Remote_Control.png',
  },
  {
    icon: Building2,
    title: 'Multi-Silo Management',
    description:
      'Monitor unlimited silos across multiple locations from a single dashboard. Scale effortlessly as your operation grows.',
    color: '#2FA84F',
    image: '/images/features/Multi_Silo_Management.png',
  },
]

/** Returns true when .dark class is on <html> — reacts to toggles in real time. */
function useIsDark() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false,
  )
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'))
    })
    obs.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

function FlipCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const isDark = useIsDark()

  const cardFrontBg   = isDark ? '#141A15' : '#ffffff'
  const cardBackBg    = isDark ? '#1A201B' : '#FAFAF7'
  const titleBarBg    = isDark ? 'rgba(30, 36, 32, 0.95)' : 'rgba(255, 255, 255, 0.95)'
  const titleColor    = isDark ? '#d1fae5' : '#111512'
  const descColor     = isDark ? '#a7f3d0' : '#111512'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="flip-card-wrapper"
      style={{ width: '100%', maxWidth: '300px', height: '226px' }}
    >
      <div
        className="flip-card"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '3.67px 9.17px 18.34px rgba(0, 0, 0, 0.25)',
          cursor: 'pointer',
          transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flip-card-inner" style={{ position: 'relative', width: '100%', height: '100%' }}>

          {/* Front of card */}
          <div
            className="flip-card-front"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '0',
              transition: 'opacity 0.4s ease-in-out',
              opacity: isHovered ? 0 : 1,
              backgroundColor: cardFrontBg,
            }}
          >
            {/* Background Image */}
            <div
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                backgroundImage: `url(${feature.image})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            {/* Overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.40)' : 'rgba(128, 128, 128, 0.25)',
                pointerEvents: 'none',
              }}
            />
            {/* Title bar */}
            <div
              style={{
                width: '100%',
                background: titleBarBg,
                padding: '1rem 1.2rem',
                backdropFilter: 'blur(10px)',
                borderBottomLeftRadius: '18px',
                borderBottomRightRadius: '18px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <h3 className="text-base font-bold text-center" style={{ color: titleColor, lineHeight: '1.3' }}>
                {feature.title}
              </h3>
            </div>
          </div>

          {/* Back of card */}
          <div
            className="flip-card-back"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: cardBackBg,
              padding: '1.5rem 1.2rem',
              transition: 'opacity 0.4s ease-in-out',
              opacity: isHovered ? 1 : 0,
              pointerEvents: isHovered ? 'auto' : 'none',
            }}
          >
            <p className="text-sm text-center leading-relaxed" style={{ color: descColor, fontWeight: 500 }}>
              {feature.description}
            </p>
          </div>

        </div>
      </div>
    </motion.div>
  )
}

export function NewFeaturesSection() {
  return (
    <section id="features" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#FAFAF7] dark:bg-background transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="inline-block bg-[#2FA84F]/10 px-4 py-2 rounded-full mb-3">
            <span className="text-[#2FA84F] text-sm font-semibold uppercase tracking-wider">
              Powerful Features
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#111512] dark:text-foreground mb-4">
            Everything You Need to <br className="hidden sm:block" />
            <span className="text-[#2FA84F]">Protect Your Grain</span>
          </h2>
          <p className="text-lg sm:text-xl text-[#4A554C] dark:text-muted-foreground max-w-3xl mx-auto">
            Comprehensive grain storage management with enterprise-grade monitoring and AI-powered insights
          </p>
        </motion.div>

        {/* Features Grid */}
        <div
          className="technologies-grid"
          style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '45px', maxWidth: '1100px', margin: '0 auto' }}
        >
          {features.map((feature, index) => (
            <FlipCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-10 sm:mt-12"
        >
          <p className="text-[#4A554C] dark:text-muted-foreground mb-6 text-lg">
            Ready to see GrainHero in action?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => { window.location.href = '/checkout' }}
              className="bg-[#2FA84F] text-white font-bold px-8 py-3.5 rounded-full hover:bg-[#2FA84F]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              View Plans & Pricing
            </button>
            <button
              onClick={() => { document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="bg-transparent border-2 border-[#2FA84F] text-[#2FA84F] font-semibold px-8 py-3.5 rounded-full hover:bg-[#2FA84F]/10 transition-all duration-300 hover:scale-105"
            >
              Learn More
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
