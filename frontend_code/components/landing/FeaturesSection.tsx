'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

const features = [
  {
    id: 'ai-prediction',
    title: 'AI-Powered Spoilage Prediction',
    description:
      'ML models predict deterioration 72 hours before it happens, saving costs and preserving grain quality.',
    image: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop',
    color: 'accent-blue'
  },
  {
    id: 'iot-sensors',
    title: 'IoT Sensor Management',
    description:
      'Real-time monitoring of temperature, humidity, and gas levels with our custom ESP32-based sensor network.',
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop',
    color: 'accent-green'
  },
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    description:
      'Comprehensive trends, historical data, and facility comparisons in a beautiful real-time interface.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    color: 'accent-blue'
  },
  {
    id: 'smart-alerts',
    title: 'Smart Alerts',
    description:
      'Instant notifications via SMS, email, and push when thresholds are breached.',
    image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400&h=300&fit=crop',
    color: 'accent-green'
  },
  {
    id: 'batch-tracking',
    title: 'Grain Batch Tracking',
    description:
      'Complete traceability from harvest to storage. Track grain batches and generate compliance reports.',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop',
    color: 'accent-blue'
  },
  {
    id: 'silo-management',
    title: 'Silo Management',
    description:
      'Monitor multiple storage silos with visual maps, capacity tracking, and automated maintenance scheduling.',
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=300&fit=crop',
    color: 'accent-green'
  }
]

export function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredPhoto, setHoveredPhoto] = useState<string | null>(null)
  
  // State for responsive scaling and rows
  const [cardsPerRow, setCardsPerRow] = useState(3)
  const [scale, setScale] = useState(1)
  const [wrapperHeight, setWrapperHeight] = useState<string | number>('auto')
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )
    const el = document.getElementById('features')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Calculate proportional scaling and row counts
  useEffect(() => {
    const updateLayout = () => {
      const currentWidth = window.innerWidth
      
      // Determine how many cards to show per row
      let targetCards = 3
      let baseWidth = 1000 // 3 cards per row fits well in 1000px

      if (currentWidth < 1000) {
        // Mobile view: exactly 2 cards per row
        targetCards = 2
        baseWidth = 680 // 2 cards (280px each = 560) + gap (40) + margin (80)
      }

      setCardsPerRow(targetCards)

      // Apply the scale transformation based on viewport vs target width
      if (currentWidth < baseWidth) {
        // Leave ~16px padding total on mobile edges so it doesn't touch the screen edge
        const newScale = Math.max((currentWidth - 16) / baseWidth, 0.25)
        setScale(newScale)
      } else {
        setScale(1)
      }
    }
    
    updateLayout()
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [])

  // Use ResizeObserver to continuously monitor layout height and update the scaled wrapper properly
  useEffect(() => {
    if (!contentRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (scale < 1) {
          // Add a tiny bit of extra height (e.g. 10px) to prevent accidental clipping
          setWrapperHeight(entry.target.scrollHeight * scale + 10)
        } else {
          setWrapperHeight('auto')
        }
      }
    })
    resizeObserver.observe(contentRef.current)
    return () => resizeObserver.disconnect()
  }, [scale])

  // Chunk features into rows based on cardsPerRow
  const rows = []
  const maxFeatures = cardsPerRow === 2 ? 4 : features.length
  const visibleFeatures = features.slice(0, maxFeatures)

  for (let i = 0; i < visibleFeatures.length; i += cardsPerRow) {
    rows.push(visibleFeatures.slice(i, i + cardsPerRow))
  }

  // The dynamic width of the inner scaling wrapper
  const baseWidthClass = cardsPerRow === 3 ? "w-[1000px]" : "w-[680px]"

  return (
    <section
      id="features"
      className="relative py-16 sm:py-20"
      style={{
        background: 'linear-gradient(135deg, #0d2818 0%, #0a1f14 30%, #071208 60%, #0a1f14 100%)',
        overflow: 'hidden'
      }}
    >
      {/* Darkroom ambient lighting */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-900/20 rounded-full blur-3xl opacity-50 block" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-900/15 rounded-full blur-2xl block opacity-50" />
      </div>

      <div className="container mx-auto px-4 relative z-10 w-full overflow-hidden">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <h2
            className={`text-3xl sm:text-5xl lg:text-6xl font-black leading-tight mb-4 lg:mb-6 text-emerald-50 transform transition-all duration-1000 delay-200 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
          >
            What We Deliver
          </h2>

          <p
            className={`text-base sm:text-xl text-emerald-200/90 leading-relaxed max-w-3xl mx-auto transform transition-all duration-1000 delay-[400ms] ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            Developed with precision, delivered with passion
          </p>
        </div>

        {/* ─── Responsive Clothesline (Scales smoothly to fit width) ─── */}
        <div 
          className="w-full flex justify-center relative" 
          style={{ height: wrapperHeight }}
        >
          <div
            ref={contentRef}
            className={`${baseWidthClass} flex-shrink-0 origin-top transform transition-opacity duration-1000 delay-[600ms] ${
              isVisible ? 'opacity-100' : 'opacity-0'
            } ${scale < 1 ? 'absolute top-0' : 'relative'}`}
            style={{ 
              transform: `scale(${scale})`, 
            }}
          >
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className={`relative ${rowIndex < rows.length - 1 ? 'mb-[120px]' : 'pb-8'}`}>
                
                {/* Rope - using right-10 left-10 makes the bar smaller and prevents it touching edges */}
                <div
                  className="absolute top-8 left-10 right-10 h-4 rope-sway"
                  style={{ animationDelay: `${rowIndex * 2}s` }}
                >
                  <RopeVisual />
                </div>

                {/* Anchor points - placed inward exactly on the rope edges */}
                <div className="absolute left-[30px] top-4 w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-800 rounded-full shadow-xl border border-gray-400 z-10">
                  <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 bg-gray-300 rounded-full opacity-80" />
                </div>
                <div className="absolute right-[30px] top-4 w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-800 rounded-full shadow-xl border border-gray-400 z-10">
                  <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 bg-gray-300 rounded-full opacity-80" />
                </div>

                {/* Hanging photos */}
                <div className="flex flex-row flex-nowrap justify-center gap-[40px] pt-16">
                  {row.map((feature, featureIndex) => {
                    const globalIndex = rowIndex * cardsPerRow + featureIndex
                    const swayClass = globalIndex % 3 === 0 ? 'photo-sway-1' : globalIndex % 3 === 1 ? 'photo-sway-2' : 'photo-sway-3'
                    
                    return (
                      <div
                        key={feature.id}
                        className={`transform transition-all duration-700 ${
                          hoveredPhoto === feature.id ? 'scale-105 -translate-y-2' : 'scale-100'
                        } ${swayClass}`}
                        style={{
                          transitionDelay: `${globalIndex * 150 + 800}ms`,
                          animationDelay: `${globalIndex * 1.0 + 3}s`
                        }}
                        onMouseEnter={() => setHoveredPhoto(feature.id)}
                        onMouseLeave={() => setHoveredPhoto(null)}
                      >
                        <Clothespin className="block" />
                        <FeatureCard 
                          feature={feature} 
                          hoveredPhoto={hoveredPhoto} 
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div className="mt-8 lg:mt-16 text-center">
          <p className="text-xs lg:text-sm text-emerald-200/70 leading-relaxed max-w-2xl mx-auto z-20 relative">
            Each feature is carefully engineered, ensuring every detail optimizes your grain
            storage operations with precision and intelligent automation.
          </p>
        </div>
      </div>
    </section>
  )
}

function RopeVisual() {
  return (
    <>
      <div className="w-full h-full bg-gradient-to-b from-yellow-800 via-amber-900 to-yellow-900 rounded-full shadow-lg" />
      <div
        className="absolute inset-0 opacity-70 rounded-full"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(139,69,19,0.6) 0px, rgba(160,82,45,0.4) 2px, transparent 4px, rgba(101,67,33,0.6) 6px, transparent 8px)',
          backgroundSize: '12px 100%'
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-yellow-700 to-transparent rounded-full opacity-80" />
      <div className="absolute -bottom-2 left-0 right-0 h-3 bg-black/30 rounded-full blur-lg" />
    </>
  )
}

function FeatureCard({ feature, hoveredPhoto }: { 
  feature: { id: string; title: string; description: string; image: string }; 
  hoveredPhoto: string | null 
}) {
  return (
    <div
      className="relative bg-white p-4 pb-8 shadow-2xl cursor-pointer w-[280px]"
      style={{
        filter:
          hoveredPhoto === feature.id
            ? 'brightness(1.1) contrast(1.05)'
            : 'brightness(1) contrast(0.95)',
        boxShadow:
          '0 20px 40px rgba(0,0,0,0.6), 0 8px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.9)'
      }}
    >
      {/* Image */}
      <div className="h-44 mb-6 rounded-sm relative overflow-hidden">
        <Image
          src={feature.image}
          alt={feature.title}
          fill
          className="object-cover rounded-sm"
          style={{
            filter: 'sepia(10%) saturate(90%) brightness(92%) contrast(1.1)'
          }}
        />
        <div className="absolute inset-0 bg-green-900/5 rounded-sm" />
      </div>

      {/* Text */}
      <div className="relative">
        <h3 className="font-black text-lg text-gray-800 mb-3 leading-tight">
          {feature.title}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {feature.description}
        </p>
      </div>

      {/* Lab stamp */}
      <div className="absolute bottom-1.5 right-2 text-xs text-gray-400 font-mono opacity-60">
        GRAINHERO
      </div>
    </div>
  )
}

// Realistic wooden clothespin component
function Clothespin({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute -top-8 left-1/2 -translate-x-1/2 z-20 ${className}`}>
      <div className="relative w-5 h-10">
        {/* Left wooden half */}
        <div className="absolute left-0 top-0 w-2.5 h-10 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-l-md shadow-md border-r border-orange-300/30">
          <div
            className="absolute inset-0 opacity-30 rounded-l-md"
            style={{
              backgroundImage:
                'linear-gradient(0deg, rgba(139,69,19,0.2) 0%, transparent 20%, rgba(160,82,45,0.15) 40%, transparent 60%, rgba(139,69,19,0.2) 80%, transparent 100%)',
              backgroundSize: '100% 8px'
            }}
          />
        </div>
        {/* Right wooden half */}
        <div className="absolute right-0 top-0 w-2.5 h-10 bg-gradient-to-l from-yellow-200 to-orange-200 rounded-r-md shadow-md border-l border-orange-300/30">
          <div
            className="absolute inset-0 opacity-30 rounded-r-md"
            style={{
              backgroundImage:
                'linear-gradient(0deg, rgba(139,69,19,0.2) 0%, transparent 20%, rgba(160,82,45,0.15) 40%, transparent 60%, rgba(139,69,19,0.2) 80%, transparent 100%)',
              backgroundSize: '100% 8px'
            }}
          />
        </div>
        {/* Metal spring */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-2 bg-gradient-to-b from-gray-300 to-gray-500 rounded-sm shadow-sm">
          <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-gray-400 rounded-full" />
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-gray-400 rounded-full" />
        </div>
        {/* Tips */}
        <div className="absolute bottom-0 left-0 w-2.5 h-2 bg-gradient-to-b from-orange-200 to-orange-300 rounded-b-md" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2 bg-gradient-to-b from-orange-200 to-orange-300 rounded-b-md" />
      </div>
    </div>
  )
}
