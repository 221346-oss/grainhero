import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const steps = [
  ['01', 'Sense', 'Temperature, humidity, moisture and CO₂, around the clock.'],
  ['02', 'Predict', 'Spoilage risk flagged 24–48 hours early.'],
  ['03', 'Alert', 'The right person. No noise.'],
  ['04', 'Save', 'Act early, sell at a better grade.'],
]

const reveal = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.5, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] as const },
})

export function SimpleSteps() {
  return (
    <section id="how-it-works" className="relative bg-[#111512] py-14 sm:py-28">
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

        {/* Two separate layouts rather than one responsive element. The dark-mode
            overrides in styles.css match on the class string, so a `sm:bg-[#...]`
            utility would get a forced background at every width — which showed up
            as panels behind the mobile arrows. Keeping the surfaces on the
            desktop-only markup avoids that entirely. */}

        {/* Phones — one arrow-linked row, no background surfaces. */}
        <div className="gh-stagger mt-9 flex items-start gap-2 sm:hidden">
          {steps.map(([num, title], i) => (
            <Fragment key={title}>
              <motion.div {...reveal(i)} className="group relative min-w-0 flex-1 pb-2">
                <span className="font-mono text-[0.625rem] tracking-[0.3em] text-[#2FA84F]">
                  {num}
                </span>
                <h3 className="mt-2 text-sm font-black text-[#FAFAF7]">{title}</h3>
                <span className="absolute bottom-0 left-0 h-px w-0 bg-[#A8E6A1] transition-all duration-500 group-hover:w-full" />
              </motion.div>

              {i < steps.length - 1 && (
                <ArrowRight aria-hidden className="mt-5 h-4 w-4 shrink-0 text-[#2FA84F]/50" />
              )}
            </Fragment>
          ))}
        </div>

        {/* sm and up — the original tiled grid, unchanged. */}
        <div className="gh-stagger mt-14 hidden grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#FAFAF7]/10 sm:grid lg:grid-cols-4">
          {steps.map(([num, title, body], i) => (
            <motion.div
              key={title}
              {...reveal(i)}
              className="group relative bg-[#111512] p-4 transition-colors duration-300 hover:bg-[#161C17] sm:p-7"
            >
              <span className="font-mono text-[0.625rem] tracking-[0.3em] text-[#2FA84F]">
                {num}
              </span>
              <h3 className="mt-3 text-base font-black text-[#FAFAF7] sm:mt-6 sm:text-xl">
                {title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#FAFAF7]/60 sm:mt-2 sm:text-sm">
                {body}
              </p>
              <span className="absolute bottom-0 left-0 h-px w-0 bg-[#A8E6A1] transition-all duration-500 group-hover:w-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
