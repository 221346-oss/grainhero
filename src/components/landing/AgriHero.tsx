import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import heroLoop from '@/assets/silo-ai-loop-v3-web.mp4.asset.json'
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
    <div className="relative min-h-[92svh] w-full overflow-hidden bg-[#111512] sm:min-h-[100svh]">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-105 object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={heroPoster}
      >
        <source src={heroLoop.url} type="video/mp4" />
      </video>

      {/* Cinematic grade — dark top for nav, bone bottom to hand off to the next section */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#111512]/70 via-[#111512]/25 to-[#111512]/85" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#FAFAF7] to-transparent dark:from-background" />

      {/* Copy */}
      <div className="relative z-10 flex min-h-[92svh] items-center justify-center px-5 text-center sm:min-h-[100svh] sm:px-8">
        <div className="max-w-4xl pb-16 sm:pb-20">
          <motion.h1
            initial={{ opacity: 0, y: 26, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.1, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="text-[2.75rem] font-black leading-[0.92] tracking-tight text-[#FAFAF7] sm:text-6xl lg:text-7xl"
          >
            The Future of
            <br />
            <span className="bg-gradient-to-r from-[#A8E6A1] to-[#2FA84F] bg-clip-text text-transparent">
              Grain Storage
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8 }}
            className="mt-8 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-8"
          >
            <p className="max-w-xs text-sm font-medium leading-relaxed text-[#FAFAF7]/80 sm:text-left sm:text-base">
              Sensors in the silo. Spoilage flagged before it starts.
            </p>
            <Link
              to="/marketplace"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#2FA84F] px-7 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:bg-[#FAFAF7] hover:text-[#111512]"
            >
              Explore smart silos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      <a
        href="#problem"
        aria-label="Scroll to next section"
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 sm:block"
      >
        <span className="block h-14 w-px bg-gradient-to-b from-[#2FA84F] to-transparent" />
      </a>
    </div>
  )
}