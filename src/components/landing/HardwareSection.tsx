import { Suspense, lazy } from 'react'
import { ClientOnly } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Cpu, Wifi, Gauge, Wrench } from 'lucide-react'

const SiloScene = lazy(() => import('./SiloScene'))

const specs = [
  { icon: Cpu, title: 'Edge controller', body: 'On-site brain that keeps logging even when the network drops.' },
  { icon: Gauge, title: 'Multi-depth probes', body: 'Temperature, moisture and CO₂ at every layer of the grain column.' },
  { icon: Wifi, title: 'LoRa + Wi-Fi', body: 'Works across sheds and remote yards without new cabling.' },
  { icon: Wrench, title: '2-hour install', body: 'Retro-fits onto silos you already own. No structural work.' },
]

export function HardwareSection() {
  return (
    <section id="hardware" className="relative overflow-hidden bg-[#F2F4EE] py-20 dark:bg-background sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        {/* 3D */}
        <div className="relative order-2 h-[380px] w-full sm:h-[520px] lg:order-1">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-[#2FA84F]/10 to-transparent" />
          <ClientOnly fallback={<div className="h-full w-full animate-pulse rounded-[2rem] bg-[#2FA84F]/5" />}>
            <Suspense fallback={<div className="h-full w-full animate-pulse rounded-[2rem] bg-[#2FA84F]/5" />}>
              <SiloScene />
            </Suspense>
          </ClientOnly>
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold uppercase tracking-widest text-[#4A554C]/50">
            Hover the glowing nodes
          </p>
        </div>

        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="order-1 lg:order-2"
        >
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#2FA84F]">
            The hardware
          </span>
          <h2 className="mt-4 text-3xl font-black leading-[1.05] tracking-tight text-[#111512] dark:text-foreground sm:text-5xl">
            Start with the silo.
            <br />
            <span className="text-[#2FA84F]">Software comes with it.</span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#4A554C] dark:text-muted-foreground sm:text-lg">
            Buy the GrainHero sensor kit for your existing silos, or a full smart silo. Every unit
            ships paired to the dashboard — pick a plan later, once you see the data.
          </p>

          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {specs.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="rounded-2xl border border-[#2FA84F]/15 bg-white p-5 transition-all hover:-translate-y-1 hover:border-[#2FA84F]/40 hover:shadow-lg dark:bg-card"
              >
                <s.icon className="h-6 w-6 text-[#2FA84F]" />
                <h3 className="mt-3 text-base font-bold text-[#111512] dark:text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#4A554C] dark:text-muted-foreground">{s.body}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/marketplace"
              className="group inline-flex items-center gap-2 rounded-full bg-[#2FA84F] px-8 py-4 font-bold text-white transition-all hover:scale-105 hover:bg-[#111512]"
            >
              Browse silos &amp; kits
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/checkout"
              className="text-sm font-semibold text-[#4A554C] underline underline-offset-4 transition-colors hover:text-[#2FA84F] dark:text-muted-foreground"
            >
              Or view software plans
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}