import { motion } from "framer-motion";
import { useTranslation } from "@/i18n";

export function SimpleSteps() {
  const { t, raw } = useTranslation();
  const steps = raw.howItWorks.steps.map((s) => [s.num, s.title, s.desc] as const);
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
          {t("howItWorks.heading1")}
          <br />
          <span className="text-[#2FA84F]">{t("howItWorks.heading2")}</span>
        </motion.h2>

        <div className="gh-stagger mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#FAFAF7]/10 lg:grid-cols-4">
          {steps.map(([num, title, body], i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
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
  );
}
