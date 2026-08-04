import { motion } from 'framer-motion'

const stats = [
  { value: '10,000+', label: 'Tons monitored' },
  { value: '99.2%', label: 'Prediction accuracy' },
  { value: '50%', label: 'Loss reduction' },
  { value: '24/7', label: 'Uptime' },
]

export function StatsSection() {
  return (
    <section id="stats-section" className="bg-[#2FA84F] py-14 sm:py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-5 sm:px-8 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="text-center"
          >
            <div className="text-3xl font-black tracking-tight text-white sm:text-4xl">{s.value}</div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
