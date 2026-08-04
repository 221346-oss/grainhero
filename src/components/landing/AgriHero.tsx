import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import heroLoop from '@/assets/silo-ai-loop-v3.mp4.asset.json'
import heroPoster from '@/assets/landing/hero-poster.jpg'

export function AgriHero() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.play().catch(() => {})
  }, [])

  return (
    <div className="relative min-h-[92svh] w-full overflow-hidden bg-[#111512] sm:min-h-[94svh]">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={heroPoster}
      >
        <source src={heroLoop.url} type="video/mp4" />
      </video>

      {/* Cinematic grade */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#111512]/72 via-[#111512]/18 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#111512]/45 via-transparent to-[#111512]/60" />

      {/* Copy */}
      <div className="relative z-10 flex min-h-[92svh] items-end sm:min-h-[94svh] sm:items-center">
        <div className="container mx-auto px-5 pb-12 sm:px-8 sm:pb-0 lg:px-12">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl text-[2.25rem] font-black leading-[1] tracking-tight text-[#A8E6A1] sm:text-5xl lg:text-6xl"
          >
            The Future of
            <br />
            Grain Storage
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.8 }}
            className="mt-4 max-w-md text-base font-medium text-[#FAFAF7] sm:text-xl"
          >
            Turning Sensor Data Into Saved Harvests
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.8 }}
            className="mt-7 flex flex-col gap-3 min-[420px]:flex-row"
          >
            <Link
              to="/marketplace"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#2FA84F] px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105 hover:bg-[#A8E6A1] hover:text-[#111512]"
            >
              Explore Smart Silos
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#FAFAF7]/60 px-6 py-3 text-sm font-semibold text-[#FAFAF7] transition-all hover:scale-105 hover:bg-[#FAFAF7] hover:text-[#111512]"
            >
              See How It Works
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  )
}