import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Cpu } from 'lucide-react'

import { NewGlassNav } from '@/components/landing/NewGlassNav'
import { AgriHero } from '@/components/landing/AgriHero'
import { ProblemMarquee } from '@/components/landing/ProblemMarquee'
import { SimpleSteps } from '@/components/landing/SimpleSteps'
import { HardwareSection } from '@/components/landing/HardwareSection'
import { AdShowcase } from '@/components/landing/AdShowcase'
import { PartnersStrip } from '@/components/landing/PartnersStrip'
import { HorizontalFAQ } from '@/components/landing/HorizontalFAQ'
import { ContactCTA } from '@/components/landing/ContactCTA'
import { StatsSection } from '@/components/landing/StatsSection'
import { NewFooter } from '@/components/landing/NewFooter'
import pricingData from '@/lib/pricing-data'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'GrainHero — AI-Powered Grain Storage Management' },
      {
        name: 'description',
        content:
          "Monitor, predict, and optimize your grain storage with GrainHero's intelligent SaaS platform. AI-powered spoilage prediction, IoT sensors, and real-time analytics.",
      },
      { property: 'og:title', content: 'GrainHero — Smart Grain Storage, Powered by AI' },
      {
        property: 'og:description',
        content:
          'AI-powered grain storage management platform with real-time monitoring and predictive analytics.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: NewHomePage,
})

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

function NewHomePage() {
  return (
    <main className="min-h-screen bg-[#EDE9D4] text-[#404F44] landing-bg dark:text-foreground">
      <NewGlassNav />
      <section id="hero" aria-label="Hero section">
        <AgriHero />
      </section>
      <section id="problem" aria-label="The problem">
        <ProblemMarquee />
      </section>
      <section id="how-it-works" aria-label="How it works">
        <SimpleSteps />
      </section>
      <section id="hardware" aria-label="Hardware and 3D silo">
        <HardwareSection />
      </section>
      <section aria-label="Brand film">
        <AdShowcase />
      </section>
      <section aria-label="Statistics">
        <StatsSection />
      </section>
      <section aria-label="Partners">
        <PartnersStrip />
      </section>
      <HorizontalFAQ />
      <section id="pricing" aria-label="Pricing">
        <PricingShowcase />
      </section>
      <section aria-label="Call to action">
        <ContactCTA />
      </section>
      <NewFooter />
    </main>
  )
}

function PricingShowcase() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    (pricingData as Plan[])[0]?.id ?? null,
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
      { threshold: 0.1 },
    )
    const el = document.getElementById('pricing')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const nextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % (pricingData as Plan[]).length)
  }, [])

  useEffect(() => {
    if (!isMobile || !isVisible) return
    const timer = setInterval(nextSlide, 4500)
    return () => clearInterval(timer)
  }, [isMobile, isVisible, nextSlide])

  const plans = pricingData as Plan[]

  return (
    <section id="pricing" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4] dark:bg-background transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-10"
        >
          <div className="inline-block bg-[#2FAC0C]/10 px-4 py-2 rounded-full mb-4">
            <span className="text-[#2FAC0C] text-sm font-semibold uppercase tracking-wider">
              Flexible Pricing
            </span>
          </div>
          <h3 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#252d26] dark:text-foreground mb-4">
            Pick the Plan That <br className="hidden sm:block" />
            <span className="text-[#2FAC0C]">Checks Your Boxes</span>
          </h3>
          <p className="text-lg text-[#404F44] dark:text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your operation. Scale up or down anytime.
          </p>
        </motion.div>

        {/* Mobile Carousel */}
        <div className="md:hidden max-w-sm mx-auto">
          <div className="relative h-[500px]">
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
                  p={plans[activeSlide]}
                  isSelected={selectedPlanId === plans[activeSlide].id}
                  setSelectedPlanId={setSelectedPlanId}
                />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex justify-center gap-2 mt-6">
            {plans.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === activeSlide ? 'bg-[#2FAC0C] scale-125' : 'bg-[#404F44]/30'
                }`}
                aria-label={`View plan ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:flex flex-wrap justify-center gap-6">
          {plans.map((p, index) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <PricingCard
                p={p}
                isSelected={selectedPlanId === p.id}
                setSelectedPlanId={setSelectedPlanId}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingCard({
  p,
  isSelected,
  setSelectedPlanId,
}: {
  p: Plan
  isSelected: boolean
  setSelectedPlanId: (id: string) => void
}) {
  const priceText = p.priceFrontend ?? `Rs. ${p.price?.toLocaleString()}${p.duration ?? ''}`
  return (
    <label
      className={`cursor-pointer text-left w-full h-full max-w-sm rounded-2xl bg-card border-2 p-7 shadow-sm transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:scale-105 block ${
        isSelected
          ? 'border-[#2FAC0C] ring-2 ring-[#2FAC0C]/20 shadow-xl'
          : 'border-[#2FAC0C]/20 hover:border-[#2FAC0C]/60'
      } ${p.popular ? 'relative overflow-hidden' : ''}`}
    >
      {p.popular && (
        <>
          <div className="absolute top-0 right-0 bg-[#2FAC0C] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            POPULAR
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-[#2FAC0C]/5 to-transparent pointer-events-none" />
        </>
      )}
      <input
        type="radio"
        name="landing-plan"
        value={p.id}
        checked={isSelected}
        onChange={() => setSelectedPlanId(p.id)}
        className="sr-only"
      />
      <div className="relative z-10">
        <h4 className="text-xl font-bold text-foreground mb-2">{p.name}</h4>
        <p className="text-3xl font-black text-[#2FAC0C] mb-2">{priceText}</p>
        {p.iotChargeLabel && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#2FAC0C] bg-[#2FAC0C]/10 border border-[#2FAC0C]/20 rounded-lg px-3 py-1.5 mb-4">
            <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{p.iotChargeLabel}</span>
          </div>
        )}
        <p className="text-muted-foreground text-sm mb-5">{p.description}</p>
        <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
          {p.features.map((f, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#2FAC0C] flex-shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Link
          to="/checkout"
          onClick={() => {
            try {
              localStorage.setItem('selectedPlanId', p.id)
            } catch {}
          }}
          className={`mt-auto inline-block w-full text-center py-3 rounded-full font-bold transition-all duration-300 hover:scale-105 ${
            isSelected
              ? 'bg-[#2FAC0C] text-white hover:bg-[#2FAC0C]/90 shadow-lg'
              : 'border-2 border-[#2FAC0C]/30 text-[#2FAC0C] hover:border-[#2FAC0C] hover:bg-[#2FAC0C]/10'
          }`}
        >
          {p.id === 'custom' ? 'Contact Us' : 'Choose Plan'}
        </Link>
      </div>
    </label>
  )
}
