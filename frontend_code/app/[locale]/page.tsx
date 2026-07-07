'use client'

import { Check, Cpu } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import pricingData from './pricing-data.js'

// New premium components
import { GlassNav } from '@/components/landing/GlassNav'
import { HeroSection } from '@/components/landing/HeroSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { StatsSection } from '@/components/landing/StatsSection'
import { TeamSection } from '@/components/landing/TeamSection'
import { PremiumFooter } from '@/components/landing/PremiumFooter'

type Plan = {
  id: string
  name: string
  priceFrontend?: string
  description: string
  features: string[]
  link?: string
  price?: number
  duration?: string
  popular?: boolean
  iotChargeLabel?: string
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* Glassmorphic Navigation */}
      <GlassNav />

      {/* Full-screen Video Hero */}
      <section id="hero" aria-label="Hero section">
        <HeroSection />
      </section>

      {/* Features — Clothesline Hanging Photos */}
      <section aria-label="Features section">
        <FeaturesSection />
      </section>

      {/* Stats & Trust */}
      <section aria-label="Statistics">
        <StatsSection />
      </section>

      {/* Pricing */}
      <section aria-label="Pricing">
        <PricingShowcase />
      </section>

      {/* Team */}
      <section aria-label="Team">
        <TeamSection />
      </section>

      {/* CTA */}
      <section aria-label="Call to action">
        <CTA />
      </section>

      {/* Premium Footer */}
      <PremiumFooter />
    </main>
  )
}

// Pricing showcase (restyled)
function PricingShowcase() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    pricingData[0]?.id ?? null
  )
  const [activeSlide, setActiveSlide] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

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
    const el = document.getElementById('pricing')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const nextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % pricingData.length)
  }, [])

  useEffect(() => {
    if (!isMobile || !isVisible) return
    const timer = setInterval(nextSlide, 4500)
    return () => clearInterval(timer)
  }, [isMobile, isVisible, nextSlide])

  return (
    <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#f0fdf4]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">

          <h3 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900">
            Pick the plan that <br className="hidden sm:block" />checks your boxes
          </h3>
        </div>

        {/* ─── Mobile: Auto-cycling carousel ─── */}
        <div className="md:hidden max-w-sm mx-auto">
          <div className="relative h-[480px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -60, scale: 0.95 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <PricingCard 
                  p={pricingData[activeSlide]} 
                  isSelected={selectedPlanId === pricingData[activeSlide].id} 
                  setSelectedPlanId={setSelectedPlanId} 
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {pricingData.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === activeSlide ? 'bg-[#00a63e] scale-125' : 'bg-gray-300'
                }`}
                aria-label={`View plan ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* ─── Desktop: Grid layout ─── */}
        <div className="hidden md:flex flex-wrap justify-center gap-6">
          {pricingData.map((p: Plan) => (
            <PricingCard 
              key={p.id}
              p={p} 
              isSelected={selectedPlanId === p.id} 
              setSelectedPlanId={setSelectedPlanId} 
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingCard({ p, isSelected, setSelectedPlanId }: { p: Plan, isSelected: boolean, setSelectedPlanId: (id: string) => void }) {
  const priceText = p.priceFrontend ?? `Rs. ${p.price?.toLocaleString()}${p.duration ?? ''}`
  return (
    <label
      className={`cursor-pointer text-left w-full h-full max-w-sm rounded-2xl bg-white border-2 p-7 shadow-sm transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl block ${
        isSelected
          ? 'border-[#00a63e] ring-2 ring-[#00a63e]/20'
          : 'border-gray-200 hover:border-[#00a63e]/60'
      }`}
    >
      <input
        type="radio"
        name="landing-plan"
        value={p.id}
        checked={isSelected}
        onChange={() => setSelectedPlanId(p.id)}
        className="sr-only"
      />
      {p.popular && (
        <div className="mb-3 text-xs font-semibold text-white inline-block bg-[#00a63e] px-3 py-1 rounded-full">
          Most Popular
        </div>
      )}
      <h4 className="text-xl font-bold">{p.name}</h4>
      <p className="text-3xl font-black mt-2 text-[#00a63e]">{priceText}</p>
      {p.iotChargeLabel && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
          <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{p.iotChargeLabel}</span>
        </div>
      )}
      <ul className="mt-5 space-y-2.5 text-sm text-gray-700">
        {p.features.map((f: string, idx: number) => (
          <li key={idx} className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#00a63e] flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/checkout"
        onClick={() => {
          try {
            localStorage.setItem('selectedPlanId', p.id)
          } catch {}
        }}
        className={`mt-6 inline-block w-full text-center py-3 rounded-full font-bold transition ${
          isSelected
            ? 'bg-[#00a63e] text-white hover:bg-[#029238]'
            : 'border-2 border-gray-200 hover:border-[#00a63e] hover:text-[#00a63e]'
        }`}
      >
        {p.id === 'custom' ? 'Contact Us' : 'Choose plan'}
      </Link>
    </label>
  )
}

// CTA Section
function CTA() {
  return (
    <section className="relative py-24 overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0d2818 0%, #0a1f14 30%, #071208 60%, #0a1f14 100%)'
    }}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, rgba(0,166,62,0.4) 1px, transparent 0)',
            backgroundSize: '40px 40px',
            width: '100%',
            height: '100%'
          }}
        />
      </div>

      {/* Floating glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00a63e]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl" />

      <div className="container mx-auto px-4 text-center relative z-10 max-w-4xl">


        <motion.h2
          className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Ready to optimize your<br />
          <span className="text-[#00a63e]">grain storage?</span>
        </motion.h2>

        <motion.p
          className="text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Join thousands of farmers and grain operators who trust GrainHero to protect their harvest
          and maximize profits.
        </motion.p>

        <motion.div
          className="flex flex-wrap gap-4 justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => (window.location.href = '/checkout')}
            className="bg-[#00a63e] text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-[#029238] transition-colors cursor-pointer"
          >
            Get Started Free
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => (window.location.href = '/contact')}
            className="bg-white/10 backdrop-blur-sm text-white px-10 py-4 rounded-full text-lg font-bold border border-white/20 hover:bg-white/15 transition-all cursor-pointer"
          >
            Contact Sales
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
