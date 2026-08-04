import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Volume2, VolumeX } from 'lucide-react'
import brandAd from '@/assets/brand-ad.mp4.asset.json'

export function AdShowcase() {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  const start = () => {
    const v = ref.current
    if (!v) return
    v.muted = false
    setMuted(false)
    v.currentTime = 0
    v.play().catch(() => {})
    setPlaying(true)
  }

  return (
    <section className="bg-[#111512] px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-10 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#A8E6A1]">
              The film
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#FAFAF7] sm:text-5xl">
              Sixty seconds. Whole story.
            </h2>
          </div>
          <button
            onClick={() => {
              const v = ref.current
              if (!v) return
              v.muted = !muted
              setMuted(!muted)
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[#FAFAF7]/30 px-5 py-2.5 text-sm font-semibold text-[#FAFAF7] transition-colors hover:bg-[#FAFAF7] hover:text-[#111512]"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="group relative aspect-video overflow-hidden rounded-3xl border border-[#A8E6A1]/20 bg-black shadow-2xl"
        >
          <video
            ref={ref}
            className="h-full w-full object-cover"
            src={brandAd.url}
            autoPlay
            muted
            loop
            playsInline
          />
          {!playing && (
            <button
              onClick={start}
              aria-label="Play with sound"
              className="absolute inset-0 flex items-center justify-center bg-[#111512]/35 transition-colors hover:bg-[#111512]/20"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2FA84F] transition-transform duration-300 group-hover:scale-110">
                <Play className="ml-1 h-8 w-8 fill-white text-white" />
              </span>
            </button>
          )}
        </motion.div>
      </div>
    </section>
  )
}