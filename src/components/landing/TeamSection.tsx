

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function TeamSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  const founders = [
    {
      name: 'Sharjeel Bilal',
      role: 'Founder & CEO',
      bounty: 'Strategic Visionary',
      description:
        'The driving force behind GrainHero, Sharjeel leads our mission to modernize global grain storage with a focus on sustainability and impact.',
      image: '/images/team/Sharjeel.jpeg',
      rotation: 'rotate-2'
    },
    {
      name: 'Muhammad Shaheer Khan',
      role: 'Co-founder & COO',
      bounty: 'Operations Lead',
      description:
        'Shaheer ensures the seamless execution of GrainHero’s operations, bridging the gap between innovative technology and real-world agricultural needs.',
      image: '/images/team/Shaheer.jpeg',
      rotation: '-rotate-1'
    },
    {
      name: 'Atif Nazir',
      role: 'Co-founder & CTO',
      bounty: 'Tech Architect',
      description:
        'The technical mastermind combining software engineering, AI research, and IoT expertise to build our world-class monitoring platform.',
      image: '/images/team/Atif.jpeg',
      rotation: 'rotate-1'
    }
  ]

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )
    const el = document.getElementById('team-section')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Auto-cycle carousel on mobile
  const nextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % founders.length)
  }, [founders.length])

  useEffect(() => {
    if (!isMobile || !isVisible) return
    const timer = setInterval(nextSlide, 3500)
    return () => clearInterval(timer)
  }, [isMobile, isVisible, nextSlide])

  return (
    <section id="team-section" className="relative py-12 sm:py-24 bg-white overflow-visible">
      <div className="container mx-auto px-4 sm:px-8 lg:px-12 max-w-7xl" style={{ overflow: 'visible' }}>
        {/* Header */}
        <div className="text-center mb-8 sm:mb-16">


          <h2
            className={`text-3xl sm:text-5xl lg:text-6xl font-black leading-tight text-gray-900 transform transition-all duration-1000 delay-200 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
          >
            <span className="block mb-1 sm:mb-2">The People Behind</span>
            <span className="block text-[#2FAC0C]">GRAINHERO</span>
          </h2>
        </div>

        {/* ─── Mobile: Auto-cycling carousel ─── */}
        <div className="md:hidden max-w-sm mx-auto" style={{ overflow: 'visible' }}>
          <div className="relative h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, x: 60, rotate: 3 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: -60, rotate: -3 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <FounderCard founder={founders[activeSlide]} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {founders.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === activeSlide ? 'bg-[#00a63e] scale-125' : 'bg-gray-300'
                }`}
                aria-label={`View founder ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* ─── Desktop: Board Frame with all 3 cards ─── */}
        <div className="hidden md:block max-w-6xl mx-auto" style={{ overflow: 'visible' }}>
          <div className="relative" style={{ overflow: 'visible' }}>
            <div
              className="bg-gradient-to-br from-black via-gray-900 to-black p-6 sm:p-8 rounded-2xl shadow-2xl relative border border-gray-800/50"
              style={{ overflow: 'visible' }}
            >
              <div
                className="bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 rounded-xl p-6 sm:p-8 relative"
                style={{ overflow: 'visible' }}
              >
                <div
                  className="relative z-10 grid grid-cols-3 gap-6 lg:gap-8"
                  style={{ overflow: 'visible' }}
                >
                  {founders.map((founder, index) => (
                    <motion.div
                      key={founder.name}
                      initial={{ opacity: 0, y: 30, rotate: 0 }}
                      animate={
                        isVisible
                          ? { opacity: 1, y: 0, rotate: parseInt(founder.rotation) || 0 }
                          : {}
                      }
                      transition={{ delay: index * 0.2 + 0.5, duration: 0.6 }}
                      whileHover={{ rotate: 0, scale: 1.05, zIndex: 20 }}
                      className="group cursor-pointer"
                      style={{
                        filter: 'drop-shadow(4px 4px 8px rgba(0,0,0,0.3))',
                        overflow: 'visible'
                      }}
                    >
                      <FounderCard founder={founder} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -inset-4 bg-black/20 rounded-2xl -z-10 blur-xl" />
          </div>
        </div>
      </div>
    </section>
  )
}

// Founder card component (shared between mobile carousel and desktop grid)
function FounderCard({ founder }: { founder: { name: string; role: string; bounty: string; description: string; image: string } }) {
  const [imageError, setImageError] = useState(false);
  const initials = founder.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2);

  return (
    <div
      className="bg-gradient-to-b from-white to-gray-50 border-4 border-black relative shadow-lg"
      style={{ overflow: 'visible' }}
    >
      {/* Push pins */}
      <div className="absolute -top-2 left-4 w-4 h-4 bg-gradient-to-br from-[#00a63e] to-[#029238] rounded-full shadow-lg border border-green-700" />
      <div className="absolute -top-2 right-4 w-4 h-4 bg-gradient-to-br from-[#00a63e] to-[#029238] rounded-full shadow-lg border border-green-700" />

      <div className="p-5 sm:p-6 text-center relative z-10">
        {/* Header */}
        <div className="mb-3 sm:mb-4">
          <h3
            className="text-xl sm:text-3xl font-black text-[#00a63e] mb-2"
            style={{ fontFamily: 'serif', letterSpacing: '0.08em' }}
          >
            FOUNDER
          </h3>
          <div className="w-full h-0.5 bg-[#00a63e]" />
        </div>

        {/* Photo */}
        <div className="relative mb-3 sm:mb-4 mx-auto w-24 h-24 sm:w-32 sm:h-32 border-2 border-black bg-gray-100 rounded-sm overflow-hidden flex items-center justify-center">
          {imageError ? (
            <div className="w-full h-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-2xl uppercase select-none">
              {initials}
            </div>
          ) : (
            <img
              src={founder.image}
              alt={founder.name}
              onError={() => setImageError(true)}
              className="absolute inset-0 w-full h-full object-cover rounded-sm"
              style={{ filter: 'sepia(10%) contrast(105%) brightness(100%) saturate(95%)' }}
            />
          )}
        </div>

        {/* Details */}
        <div className="text-left space-y-1.5 sm:space-y-2" style={{ fontFamily: 'serif' }}>
          <div className="font-black text-base sm:text-lg text-black">{founder.name}</div>
          <div className="font-bold text-[#00a63e] text-sm sm:text-base">{founder.role}</div>
          <div className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {founder.bounty}
          </div>
          <div className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-gray-50/50 p-2.5 sm:p-3 border-l-2 border-[#00a63e]">
            {founder.description}
          </div>
        </div>
      </div>
    </div>
  )
}
