import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const faqs = [
  {
    q: 'How does the AI predict spoilage?',
    a: 'It learns the fingerprint of your grain — temperature, humidity, moisture and CO₂ over time — and flags the pattern that comes before spoilage, usually 24–48 hours early.',
  },
  {
    q: 'Do I need new silos?',
    a: 'No. The sensor kit retro-fits onto silos and warehouses you already own. Install takes about two hours with no structural work.',
  },
  {
    q: 'What if the internet drops?',
    a: 'The edge controller buffers up to 7 days of readings locally and syncs everything the moment connectivity returns. Critical alerts can go out over SMS.',
  },
  {
    q: 'Can my whole team use it?',
    a: 'Yes — Admin, Manager, Advisor and Technician roles each get their own view, permissions and alerts, so nobody drowns in notifications meant for someone else.',
  },
  {
    q: 'How many sites can I run?',
    a: 'Unlimited silos across unlimited locations on one dashboard, with per-site thresholds and comparative reporting.',
  },
  {
    q: 'What does it cost to start?',
    a: 'You start with hardware. The dashboard is included from day one, and you only choose a software plan once your silos are live and reporting.',
  },
]

export function HorizontalFAQ() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0, 1], ['2%', '-72%'])
  const bar = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <section id="faq" ref={ref} className="relative h-[320vh] bg-[#252d26]">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-10 w-full max-w-7xl px-5 sm:px-8">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#8FE04B]">
            Questions
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#EDE9D4] sm:text-5xl lg:text-6xl">
            Scroll sideways.
          </h2>
        </div>

        <motion.div style={{ x }} className="flex gap-6 px-5 sm:px-8">
          {faqs.map((f, i) => (
            <div
              key={f.q}
              className="group relative flex h-[380px] w-[300px] shrink-0 flex-col justify-between rounded-3xl border border-[#EDE9D4]/12 bg-[#2c352d] p-8 transition-colors duration-300 hover:border-[#8FE04B]/50 hover:bg-[#334034] sm:w-[420px]"
            >
              <span className="text-sm font-black text-[#8FE04B]/40">0{i + 1}</span>
              <div>
                <h3 className="text-xl font-black leading-tight text-[#EDE9D4] sm:text-2xl">
                  {f.q}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-[#EDE9D4]/65 sm:text-base">{f.a}</p>
              </div>
              <div className="h-1 w-10 rounded-full bg-[#8FE04B] transition-all duration-300 group-hover:w-24" />
            </div>
          ))}
        </motion.div>

        <div className="mx-auto mt-12 h-1 w-full max-w-7xl overflow-hidden rounded-full bg-[#EDE9D4]/10 px-5">
          <motion.div style={{ width: bar }} className="h-full rounded-full bg-[#8FE04B]" />
        </div>
      </div>
    </section>
  )
}