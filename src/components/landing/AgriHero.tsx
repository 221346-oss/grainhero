import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import heroLoop from '@/assets/silo-flight.mp4.asset.json'

export function AgriHero() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.play().catch(() => {})
  }, [])

  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-[#111512]">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src={heroLoop.url} type="video/mp4" />
      </video>

      {/* Cinematic grade */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#111512]/85 via-[#111512]/20 to-[#111512]/70" />

      {/* Copy */}
      <div className="relative z-10 flex min-h-[100svh] items-start">
        <div className="container mx-auto px-5 pt-28 sm:px-8 sm:pt-36 lg:px-12">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl text-[2.6rem] font-black leading-[0.95] tracking-tight text-[#A8E6A1] sm:text-6xl lg:text-8xl"
          >
            The Future of
            <br />
            Grain Storage
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.8 }}
            className="mt-5 max-w-xl text-lg font-medium text-[#FAFAF7] sm:text-2xl"
          >
            Turning Sensor Data Into Saved Harvests
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.8 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              to="/marketplace"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#2FA84F] px-8 py-4 text-base font-bold text-white transition-all hover:scale-105 hover:bg-[#A8E6A1] hover:text-[#111512]"
            >
              Explore Smart Silos
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full border-2 border-[#FAFAF7]/60 px-8 py-4 text-base font-semibold text-[#FAFAF7] transition-all hover:scale-105 hover:bg-[#FAFAF7] hover:text-[#111512]"
            >
              See How It Works
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  )
}