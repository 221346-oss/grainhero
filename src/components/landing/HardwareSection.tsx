import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

const specs = [
  ['Edge controller', 'Keeps logging when the network drops.'],
  ['Multi-depth probes', 'Temperature, moisture and CO₂ per layer.'],
  ['LoRa + Wi-Fi', 'Works across remote yards, no new cabling.'],
  ['2-hour install', 'Retro-fits onto silos you already own.'],
]

export function HardwareSection() {
  return (
    <section
      id="hardware"
      className="gh-grain relative bg-[#FAFAF7] py-20 dark:bg-background sm:py-28"
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-[1.75rem] font-black leading-[1.02] tracking-tight text-[#111512] dark:text-foreground sm:text-5xl">
            Start with the silo.{' '}
            <span className="text-[#2FA84F]">Software comes with it.</span>
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#4A554C] dark:text-muted-foreground sm:text-base">
            Every unit ships paired to the dashboard.
          </p>
        </motion.div>

        <div className="gh-stagger mt-14 grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-12 sm:gap-y-8">
          {specs.map(([title, body], i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative border-t border-[#111512]/12 pt-5 dark:border-border"
            >
              <span className="absolute -top-px left-0 h-px w-0 bg-[#2FA84F] transition-all duration-500 group-hover:w-full" />
              <h3 className="text-sm font-black text-[#111512] dark:text-foreground sm:text-base">
                {title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#4A554C] dark:text-muted-foreground sm:text-sm">
                {body}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-14">
          <Link
            to="/marketplace"
            className="group inline-flex items-center gap-2 rounded-full border-2 border-[#111512]/20 px-7 py-3.5 text-sm font-bold text-[#111512] transition-all duration-300 hover:border-[#2FA84F] hover:bg-[#2FA84F] hover:text-white dark:border-border dark:text-foreground"
          >
            Shop hardware
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
