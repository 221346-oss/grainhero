'use client'

import { useState, useEffect } from 'react'

export function HowItWorks() {
  const [activeFrame, setActiveFrame] = useState(-1)
  const [animationStarted, setAnimationStarted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const steps = [
    {
      number: '01',
      title: 'Connect Sensors',
      description: 'Install IoT sensors in your silos — temperature, humidity, and gas detection in minutes.',
      color: 'border-[#00a63e]'
    },
    {
      number: '02',
      title: 'Monitor Data',
      description: 'Real-time dashboard with live readings from every storage unit across your facility.',
      color: 'border-emerald-500'
    },
    {
      number: '03',
      title: 'AI Prediction',
      description: 'Machine learning models analyze patterns to predict spoilage 72 hours before it happens.',
      color: 'border-[#00a63e]'
    },
    {
      number: '04',
      title: 'Smart Alerts',
      description: 'Instant notifications via SMS, email, and app when thresholds are breached.',
      color: 'border-emerald-500'
    },
    {
      number: '05',
      title: 'Optimize Storage',
      description: 'Data-driven recommendations to maximize grain quality and minimize losses.',
      color: 'border-[#00a63e]'
    }
  ]

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animationStarted) {
          setIsVisible(true)
          setTimeout(() => {
            setAnimationStarted(true)
            steps.forEach((_, index) => {
              setTimeout(() => {
                setActiveFrame(index)
              }, index * 2000 + 1000)
            })
          }, 500)
        }
      },
      { threshold: 0.2 }
    )

    const el = document.getElementById('how-it-works')
    if (el) observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationStarted])

  return (
    <section id="how-it-works" className="relative py-24 bg-white overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#f0fdf4]/30 to-white" />

      {/* Film grain texture */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.8) 1px, transparent 0)',
          backgroundSize: '3px 3px'
        }}
      />

      <div className="container mx-auto px-6 sm:px-8 lg:px-12 relative z-10 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div
            className={`inline-flex items-center gap-3 mb-6 transform transition-all duration-1000 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="w-3 h-3 bg-[#00a63e] rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              How It Works
            </span>
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
          </div>

          <h2
            className={`text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 text-gray-900 transform transition-all duration-1000 delay-200 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
          >
            From Sensor to Savings
          </h2>

          <p
            className={`text-xl text-gray-500 leading-relaxed max-w-3xl mx-auto transform transition-all duration-1000 delay-[400ms] ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            Five simple steps to protect your grain and maximize profitability
          </p>
        </div>

        {/* Film Strip Container */}
        <div className="relative max-w-7xl mx-auto">
          {/* Film strip background */}
          <div
            className="relative bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 rounded-xl overflow-hidden"
            style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.05)' }}
          >
            {/* Film perforations — top */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-black z-20 overflow-hidden">
              <div
                className={`flex items-center justify-between px-12 h-full ${
                  animationStarted ? 'perforations-scroll-animation' : ''
                }`}
                style={{ width: '200%' }}
              >
                {[...Array(40)].map((_, i) => (
                  <div
                    key={`top-${i}`}
                    className="w-4 h-3 bg-gray-800 rounded-sm border border-gray-700 flex-shrink-0"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)' }}
                  />
                ))}
              </div>
            </div>

            {/* Film perforations — bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-black z-20 overflow-hidden">
              <div
                className={`flex items-center justify-between px-12 h-full ${
                  animationStarted ? 'perforations-scroll-animation' : ''
                }`}
                style={{ width: '200%' }}
              >
                {[...Array(40)].map((_, i) => (
                  <div
                    key={`bottom-${i}`}
                    className="w-4 h-3 bg-gray-800 rounded-sm border border-gray-700 flex-shrink-0"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)' }}
                  />
                ))}
              </div>
            </div>

            {/* Film Frames */}
            <div className="relative py-6 px-8 overflow-hidden h-64 max-w-full">
              <div
                className={`flex transition-transform duration-1000 ease-in-out ${
                  animationStarted ? 'film-scroll-animation' : ''
                }`}
                style={{ width: 'max-content', gap: '32px' }}
              >
                {/* Start frame */}
                <div
                  className="flex-shrink-0 w-72 sm:w-80 h-52 bg-gray-800 rounded-lg border-2 border-gray-700 opacity-60 flex items-center justify-center"
                  style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}
                >
                  <div className="text-gray-400 font-mono tracking-wider">● START</div>
                </div>

                {/* Step frames */}
                {steps.map((step, index) => (
                  <div
                    key={step.number}
                    className={`flex-shrink-0 w-72 sm:w-80 h-52 bg-white rounded-lg border-4 transition-colors duration-500 ${
                      activeFrame >= index ? step.color : 'border-gray-600'
                    }`}
                    style={{ boxShadow: '0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)' }}
                  >
                    <div className="relative h-full p-6 flex flex-col justify-between">
                      <div
                        className="absolute -top-4 -left-4 w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center font-black z-10 border-2 border-[#00a63e] text-lg"
                        style={{ boxShadow: '0 6px 12px rgba(0,0,0,0.4)' }}
                      >
                        {step.number}
                      </div>

                      <div>
                        <h3 className="font-black text-xl leading-tight mb-3 text-gray-900 mt-4">
                          {step.title}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                      </div>

                      {/* Frame edge lines */}
                      <div className="absolute left-1 top-1 bottom-1 w-px bg-gray-200" />
                      <div className="absolute right-1 top-1 bottom-1 w-px bg-gray-200" />
                    </div>
                  </div>
                ))}

                {/* End frame */}
                <div
                  className="flex-shrink-0 w-72 sm:w-80 h-52 bg-gray-800 rounded-lg border-2 border-gray-700 opacity-60 flex items-center justify-center"
                  style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}
                >
                  <div className="text-gray-400 font-mono tracking-wider">● END</div>
                </div>

                {/* Duplicate for loop */}
                <div
                  className="flex-shrink-0 w-72 sm:w-80 h-52 bg-gray-800 rounded-lg border-2 border-gray-700 opacity-60 flex items-center justify-center"
                  style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}
                >
                  <div className="text-gray-400 font-mono tracking-wider">● START</div>
                </div>
                {steps.map((step, index) => (
                  <div
                    key={`dup-${step.number}`}
                    className={`flex-shrink-0 w-72 sm:w-80 h-52 bg-white rounded-lg border-4 transition-colors duration-500 ${
                      activeFrame >= index ? step.color : 'border-gray-600'
                    }`}
                    style={{ boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}
                  >
                    <div className="relative h-full p-6 flex flex-col justify-between">
                      <div className="absolute -top-4 -left-4 w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center font-black z-10 border-2 border-[#00a63e] text-lg">
                        {step.number}
                      </div>
                      <div>
                        <h3 className="font-black text-xl leading-tight mb-3 text-gray-900 mt-4">{step.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Projector light */}
          {activeFrame >= 0 && (
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute top-1/2 left-1/2 w-48 h-48 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
                style={{
                  background: 'radial-gradient(circle, rgba(0,166,62,0.9) 0%, rgba(0,166,62,0.4) 20%, transparent 60%)',
                  animation: 'projectorLight 12s ease-in-out infinite'
                }}
              />
            </div>
          )}
        </div>

        {/* Process indicators */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-6 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl px-8 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#00a63e] rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-gray-900">Real-time</span>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
              <span className="text-sm font-semibold text-gray-900">24/7 Monitoring</span>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
              <span className="text-sm font-semibold text-gray-900">99.2% Accuracy</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
