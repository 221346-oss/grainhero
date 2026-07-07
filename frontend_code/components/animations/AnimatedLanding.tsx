"use client"

import React, { useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

// 3D helpers removed; using background image instead

// Hero Section with Background Image
export function AnimatedHero({
  title,
  subtitle,
  ctaText,
  onCtaClick
}: {
  title: string
  subtitle: string
  ctaText: string
  onCtaClick: () => void
}) {
  useEffect(() => { }, [])

  return (
    <div className="relative h-[88vh] md:h-screen overflow-hidden">
      {/* Background image */}
      <Image src="/images/grain-fields-hero.jpg" alt="Grain fields" fill priority className="object-cover object-center" />
      {/* Overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/40" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="text-center text-white max-w-4xl mx-auto px-4">
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-2xl"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {title}
          </motion.h1>

          <motion.p
            className="text-lg md:text-2xl mb-8 text-white/90 drop-shadow-lg"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            {subtitle}
          </motion.p>

          <motion.button
            className="bg-[#00a63e] text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-[#029238] transition-colors"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={onCtaClick}
          >
            {ctaText}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// Animated Feature Cards
export function AnimatedFeatureCards({
  features
}: {
  features: Array<{
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
    color: string
  }>
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-16">
      {features.map((feature, index) => (
        <motion.div
          key={index}
          className="bg-white rounded-2xl p-8 shadow-xl"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          whileHover={{
            y: -10,
            transition: { duration: 0.3 }
          }}
        >
          <motion.div
            className={`inline-flex p-4 rounded-full ${feature.color} mb-6`}
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <feature.icon className="w-8 h-8 text-white" />
          </motion.div>

          <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
          <p className="text-gray-600 text-lg">{feature.description}</p>
        </motion.div>
      ))}
    </div>
  )
}

// Animated Stats Section
export function AnimatedStatsSection({
  stats
}: {
  stats: Array<{
    value: number
    label: string
    suffix?: string
  }>
}) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="text-center text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <motion.div
                className="text-5xl font-bold mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: index * 0.2 + 0.5 }}
              >
                <span>
                  {stat.value.toLocaleString()}
                  {stat.suffix}
                </span>
              </motion.div>
              <p className="text-xl text-blue-100">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Animated Testimonial Cards
export function AnimatedTestimonials({
  testimonials
}: {
  testimonials: Array<{
    name: string
    role: string
    content: string
    avatar?: string
  }>
}) {
  return (
    <div className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-4xl font-bold text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          What Our Users Say
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-lg"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold">{testimonial.name}</h4>
                  <p className="text-gray-600 text-sm">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-gray-700 italic">&ldquo;{testimonial.content}&rdquo;</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Animated CTA Section
export function AnimatedCTA({
  title,
  description,
  buttonText,
  onButtonClick
}: {
  title: string
  description: string
  buttonText: string
  onButtonClick: () => void
}) {
  return (
    <div className="bg-gradient-to-r from-[#00a63e] to-[#029238] py-20">
      <div className="container mx-auto px-4 text-center">
        <motion.h2
          className="text-4xl md:text-6xl font-bold text-white mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {title}
        </motion.h2>

        <motion.p
          className="text-xl text-green-100 mb-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {description}
        </motion.p>

        <motion.button
          className="bg-white text-[#00a63e] px-8 py-4 rounded-full text-lg font-semibold hover:bg-green-50 transition-colors"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onButtonClick}
        >
          {buttonText}
        </motion.button>
      </div>
    </div>
  )
}
