import { motion } from 'framer-motion'
import { Radio, BrainCircuit, BellRing, ShieldCheck } from 'lucide-react'

const steps = [
  {
    icon: Radio,
    title: 'Sense',
    body: 'Sensors inside every silo read temperature, humidity, moisture and CO₂ around the clock.',
  },
  {
    icon: BrainCircuit,
    title: 'Predict',
    body: 'Our models learn your grain and flag spoilage risk 24–48 hours before it shows up.',
  },
  {
    icon: BellRing,
    title: 'Alert',
    body: 'The right person gets the right alert — manager, technician or advisor. No noise.',
  },
  {
    icon: ShieldCheck,
    title: 'Save',
    body: 'Act early, keep quality high, and sell the same harvest at a better grade.',
  },
]

export function SimpleSteps() {
  return (
    <section id="how-it-works" className="bg-[#111512] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#A8E6A1]">
            How it works
          </span>
          <h2 className="mt-4 text-3xl font-black leading-[1.05] tracking-tight text-[#FAFAF7] sm:text-5xl lg:text-6xl">
            Four steps. That&apos;s the whole system.
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-[#FAFAF7]/15 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative bg-[#111512] p-8 transition-colors hover:bg-[#1A201B] sm:p-10"
            >
              <span className="text-sm font-black text-[#A8E6A1]/50">0{i + 1}</span>
              <s.icon className="mt-6 h-9 w-9 text-[#A8E6A1] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110" />
              <h3 className="mt-6 text-2xl font-black text-[#FAFAF7]">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#FAFAF7]/70">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}