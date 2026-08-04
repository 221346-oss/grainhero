import { motion } from 'framer-motion'

const partners = ['NICAT', 'HUAWEI', 'NUST', 'HEC', 'NCRA', 'PARC']

export function PartnersStrip() {
  return (
    <section className="border-y border-[#252d26]/10 bg-[#F7F8EE] py-14 dark:bg-background">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="text-center text-xs font-bold uppercase tracking-[0.3em] text-[#404F44]/60 dark:text-muted-foreground">
          Backed &amp; supported by
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-20">
          {partners.map((p, i) => (
            <motion.span
              key={p}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="cursor-default text-xl font-black tracking-[0.18em] text-[#252d26]/35 grayscale transition-all duration-300 hover:text-[#2FAC0C] hover:opacity-100 dark:text-foreground/40 sm:text-2xl"
            >
              {p}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  )
}