import { motion } from 'framer-motion'

const rows = [
  {
    speed: 46,
    reverse: false,
    items: [
      'How much grain did we lose last season?',
      'Is the moisture rising inside silo 3?',
      'Why did that batch spoil overnight?',
      'Who last checked the aeration fans?',
    ],
  },
  {
    speed: 58,
    reverse: true,
    items: [
      'Can we predict spoilage before it starts?',
      'Which warehouse needs attention today?',
      'How do we prove quality to buyers?',
      'What is the safe storage window left?',
    ],
  },
  {
    speed: 52,
    reverse: false,
    items: [
      'Are the sensors even online right now?',
      'How do we scale to ten more silos?',
      'Can my team see this from the field?',
      'What does the data actually tell us?',
    ],
  },
]

function Chip({ text, tone }: { text: string; tone: number }) {
  const tones = ['bg-[#2FA84F] text-white', 'bg-[#A8E6A1] text-[#111512]', 'bg-[#C7D9C1] text-[#111512]']
  return (
    <span
      className={`mx-2 inline-flex shrink-0 items-center gap-3 rounded-full px-6 py-3.5 text-sm font-bold sm:text-base ${tones[tone % 3]}`}
    >
      <span className="h-7 w-7 shrink-0 rounded-full bg-current opacity-20" />
      {text}
    </span>
  )
}

export function ProblemMarquee() {
  return (
    <section id="problem" className="overflow-hidden bg-[#F2F4EE] py-20 dark:bg-background sm:py-28">
      <div className="mx-auto max-w-5xl px-5 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl font-black leading-[1.08] tracking-tight text-[#2FA84F] sm:text-5xl lg:text-6xl"
        >
          Grain operators juggle dozens of unknowns every single day. What if the silo answered
          them for you?
        </motion.h2>
      </div>

      <div className="mt-14 space-y-4">
        {rows.map((row, ri) => (
          <div key={ri} className="relative flex overflow-hidden">
            <motion.div
              className="flex whitespace-nowrap"
              animate={{ x: row.reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
              transition={{ duration: row.speed, ease: 'linear', repeat: Infinity }}
            >
              {[...row.items, ...row.items, ...row.items, ...row.items].map((t, i) => (
                <Chip key={i} text={t} tone={i + ri} />
              ))}
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  )
}