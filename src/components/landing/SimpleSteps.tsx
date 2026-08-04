import { motion } from 'framer-motion'

const steps = [
  ['Sense', 'Sensors read temperature, humidity, moisture and CO₂ around the clock.'],
  ['Predict', 'Models flag spoilage risk 24–48 hours before it shows up.'],
  ['Alert', 'The right person gets the right alert. No noise.'],
  ['Save', 'Act early and sell the same harvest at a better grade.'],
]

export function SimpleSteps() {
  return (
    <section id="how-it-works" className="bg-[#111512] py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl text-2xl font-black leading-[1.1] tracking-tight text-[#FAFAF7] sm:text-4xl"
        >
          Four steps. That&apos;s the whole system.
        </motion.h2>

        <div className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, body], i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="group border-t border-[#FAFAF7]/15 pt-4 transition-colors hover:border-[#A8E6A1]"
            >
              <h3 className="text-base font-black text-[#FAFAF7]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#FAFAF7]/65">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
