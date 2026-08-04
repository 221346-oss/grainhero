import { motion } from 'framer-motion'

const steps = [
  ['01', 'Sense', 'Temperature, humidity, moisture and CO₂, around the clock.'],
  ['02', 'Predict', 'Spoilage risk flagged 24–48 hours early.'],
  ['03', 'Alert', 'The right person. No noise.'],
  ['04', 'Save', 'Act early, sell at a better grade.'],
]

export function SimpleSteps() {
  return (
    <section id="how-it-works" className="relative bg-[#111512] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl text-[1.75rem] font-black leading-[1.02] tracking-tight text-[#FAFAF7] sm:text-5xl"
        >
          Four steps.
          <br />
          <span className="text-[#2FA84F]">That&apos;s the whole system.</span>
        </motion.h2>

        <div className="gh-stagger mt-14 grid gap-px overflow-hidden rounded-2xl bg-[#FAFAF7]/10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([num, title, body], i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
              className="group relative bg-[#111512] p-7 transition-colors duration-300 hover:bg-[#161C17]"
            >
              <span className="font-mono text-[0.625rem] tracking-[0.3em] text-[#2FA84F]">
                {num}
              </span>
              <h3 className="mt-6 text-xl font-black text-[#FAFAF7]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#FAFAF7]/60">{body}</p>
              <span className="absolute bottom-0 left-0 h-px w-0 bg-[#A8E6A1] transition-all duration-500 group-hover:w-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
