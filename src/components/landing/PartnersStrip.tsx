import { motion } from "framer-motion";

const partners = ["NICAT", "HUAWEI", "NUST", "HEC", "NCRA", "PARC"];

export function PartnersStrip() {
  return (
    <section className="gh-grain relative border-y border-[#111512]/10 bg-[#FAFAF7] py-12 dark:bg-background sm:py-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="gh-stagger flex flex-wrap items-center justify-center gap-x-8 gap-y-6 sm:gap-x-20 sm:gap-y-8">
          {partners.map((p, i) => (
            <motion.span
              key={p}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="cursor-default text-base font-black tracking-[0.18em] text-[#111512]/35 grayscale transition-all duration-300 hover:text-[#2FA84F] hover:opacity-100 dark:text-foreground/40 sm:text-2xl"
            >
              {p}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
