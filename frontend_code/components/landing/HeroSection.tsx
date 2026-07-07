'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wheat } from 'lucide-react'

export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0
      videoRef.current.muted = true
      videoRef.current.defaultMuted = true

      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => { })
      }
    }
  }, [])


  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* Background Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover scale-110"
        autoPlay
        muted
        loop
        playsInline
        poster="/images/grain-fields-hero.jpg"
      >
        {/* Pexels free stock: Golden wheat field aerial footage */}
        <source
          src="https://videos.pexels.com/video-files/4702791/4702791-uhd_2560_1440_25fps.mp4"
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {/* Overlay gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/50" />

      {/* Floating decorative grains */}
      <Wheat className="absolute top-32 left-20 w-5 h-5 text-[#00a63e] float-gentle opacity-20 -rotate-12 blur-[2px]" />
      <Wheat className="absolute top-52 right-32 w-6 h-6 text-[#00a63e] drift-left opacity-15 rotate-45 blur-[1px]" />
      <Wheat className="absolute bottom-48 left-1/4 w-7 h-7 text-emerald-400 drift-right opacity-15 -rotate-45 blur-[3px]" />
      <Wheat className="absolute top-1/3 right-1/4 w-4 h-4 text-green-300 float-gentle opacity-20 rotate-12 blur-[2px]" />

      {/* Hero Content — Bottom Left */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="absolute bottom-16 sm:bottom-20 left-6 sm:left-8 lg:left-12 z-40"
      >
        <div className="max-w-2xl">

          {/* Main title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05] text-white mb-6">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.7 }}
            >
              SMART GRAIN
            </motion.span>
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.7 }}
            >
              STORAGE
            </motion.span>
            <motion.span
              className="block text-[#00a63e]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.7 }}
            >
              POWERED BY AI
            </motion.span>
          </h1>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { window.location.href = '/checkout' }}
              className="bg-[#00a63e]/80 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,166,62,0.3)] text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[#00a63e] transition-all duration-300 text-base cursor-pointer"
            >
              Start Free Trial
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center pt-2"
        >
          <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
        </motion.div>
      </motion.div>
    </div>
  )
}
