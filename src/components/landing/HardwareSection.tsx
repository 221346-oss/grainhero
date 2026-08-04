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
    <section id="hardware" className="bg-[#F2F4EE] py-16 dark:bg-background sm:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl font-black leading-[1.1] tracking-tight text-[#111512] dark:text-foreground sm:text-4xl">
            Start with the silo.{' '}
            <span className="text-[#2FA84F]">Software comes with it.</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#4A554C] dark:text-muted-foreground sm:text-base">
            Buy the sensor kit for your existing silos, or a full smart silo. Every unit ships paired
            to the dashboard.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {specs.map(([title, body], i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="border-t border-[#111512]/10 pt-4 dark:border-border"
            >
              <h3 className="text-sm font-bold text-[#111512] dark:text-foreground">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#4A554C] dark:text-muted-foreground">
                {body}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10">
          <Link
            to="/marketplace"
            className="group inline-flex items-center gap-2 rounded-full border-2 border-[#111512]/25 px-6 py-3 text-sm font-bold text-[#111512] transition-all hover:border-[#2FA84F] hover:bg-[#2FA84F] hover:text-white dark:border-border dark:text-foreground"
          >
            Shop hardware
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
