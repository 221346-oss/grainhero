import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  { q: 'How does the AI predict spoilage?', a: 'It flags the pattern that comes before spoilage, 24–48 hours early.' },
  { q: 'Do I need new silos?', a: 'No. The kit retro-fits onto silos you already own.' },
  { q: 'What if the internet drops?', a: 'The controller buffers 7 days locally and syncs on reconnect.' },
  { q: 'Can my whole team use it?', a: 'Yes — each role gets its own view and alerts.' },
  { q: 'What does it cost to start?', a: 'Start with hardware. The dashboard is included.' },
]

export function HorizontalFAQ() {
  const ref = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const bar = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  const reduceMotion = useReducedMotion()

  // Desktop keeps the original 2% → -68% sweep. On phones that percentage left
  // the last card ~59px off-screen, so below sm the travel is measured instead.
  // Both are read from refs because useTransform captures its callback once.
  const [isDesktop, setIsDesktop] = useState(true)
  const [distance, setDistance] = useState(0)
  const isDesktopRef = useRef(true)
  const distanceRef = useRef(0)

  useEffect(() => {
    const track = trackRef.current
    const mq = window.matchMedia('(min-width: 640px)')

    const sync = () => {
      isDesktopRef.current = mq.matches
      setIsDesktop(mq.matches)
      if (track) {
        distanceRef.current = Math.max(0, track.scrollWidth - track.clientWidth)
        setDistance(distanceRef.current)
      }
    }

    sync()
    mq.addEventListener('change', sync)
    const observer = track ? new ResizeObserver(sync) : null
    observer?.observe(track!)

    return () => {
      mq.removeEventListener('change', sync)
      observer?.disconnect()
    }
  }, [])

  const x = useTransform(scrollYProgress, (v) =>
    isDesktopRef.current ? `${2 - v * 70}%` : -v * distanceRef.current,
  )

  return (
    <section
      id="faq"
      ref={ref}
      className="relative bg-[#111512] sm:h-[240vh]"
      // Phones scroll exactly as far as the track needs to travel, so the run
      // ends on the last card. Desktop keeps its 240vh via the class above.
      style={isDesktop ? undefined : { height: `calc(100vh + ${distance}px)` }}
    >
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-10 w-full max-w-7xl px-5 sm:px-8">
          <h2 className="text-[1.75rem] font-black tracking-tight text-[#FAFAF7] sm:text-4xl">
            Everything worth asking.
          </h2>
        </div>

        <motion.div ref={trackRef} style={{ x }} className="flex gap-4 px-5 sm:px-8">
          {faqs.map((f) => (
            <div
              key={f.q}
              className="group relative flex h-[220px] w-[260px] shrink-0 flex-col justify-between rounded-2xl border border-[#FAFAF7]/12 bg-[#1A201B] p-6 transition-colors duration-300 hover:border-[#A8E6A1]/50 hover:bg-[#222B23] sm:w-[320px]"
            >
              <div>
                <h3 className="text-base font-black leading-tight text-[#FAFAF7] sm:text-lg">
                  {f.q}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#FAFAF7]/65">{f.a}</p>
              </div>
              <div className="h-1 w-8 rounded-full bg-[#A8E6A1] transition-all duration-300 group-hover:w-20" />
            </div>
          ))}
          {/* Right-hand gutter so the final card doesn't finish flush to the
              edge. Hidden from sm up, where the percentage sweep is unaffected. */}
          <div aria-hidden className="w-1 shrink-0 sm:hidden" />
        </motion.div>

        <div className="mx-auto mt-10 h-1 w-full max-w-7xl overflow-hidden rounded-full bg-[#FAFAF7]/10 px-5">
          <motion.div style={{ width: bar }} className="h-full rounded-full bg-[#A8E6A1]" />
        </div>

        <p className="mx-auto mt-4 flex w-full max-w-7xl items-center gap-1.5 px-5 text-xs text-[#FAFAF7]/60 sm:px-8">
          <motion.span
            aria-hidden="true"
            className="inline-flex text-[#A8E6A1]"
            animate={reduceMotion ? undefined : { y: [0, 3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.span>
          Swipe down for more
        </p>
      </div>
    </section>
  )
}
