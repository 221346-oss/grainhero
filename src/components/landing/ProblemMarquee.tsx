import { motion } from "framer-motion";
import { useTranslation } from "@/i18n";

export function ProblemMarquee() {
  const { t, raw, locale } = useTranslation();
  const questions = raw.problem.questions;
  const heading = t("problem.heading", { highlight: raw.problem.highlight });
  const rows = [
    {
      speed: 44,
      reverse: false,
      items: questions.slice(0, 3),
    },
    {
      speed: 56,
      reverse: true,
      items: questions.slice(3, 6),
    },
  ];

  const isUrdu = locale === "ur";

  return (
    <section
      id="problem"
      className="gh-grain relative overflow-hidden bg-[#FAFAF7] py-20 dark:bg-background sm:py-28"
    >
      <div className="mx-auto max-w-3xl px-5 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-[1.75rem] font-black leading-[1.05] tracking-tight text-[#111512] dark:text-foreground sm:text-5xl"
        >
          {heading}
        </motion.h2>
      </div>

      <div className="mt-14 space-y-6">
        {rows.map((row, ri) => (
          <div key={ri} className="relative flex overflow-hidden">
            <motion.div
              className={`flex shrink-0 items-center whitespace-nowrap ${isUrdu ? "gh-urdu-marquee" : ""}`}
              animate={{ x: row.reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
              transition={{ duration: row.speed, ease: "linear", repeat: Infinity }}
            >
              {[...row.items, ...row.items, ...row.items, ...row.items].map((t, i) => (
                <span key={i} className="flex shrink-0 items-center">
                  <span
                    dir={isUrdu ? "rtl" : undefined}
                    className={`whitespace-nowrap px-8 text-2xl font-black tracking-tight sm:text-4xl ${
                      (i + ri) % 2 === 0
                        ? "text-[#111512] dark:text-foreground"
                        : "text-[#C7D9C1] dark:text-muted-foreground/50"
                    }`}
                  >
                    {t}
                  </span>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#2FA84F]" />
                </span>
              ))}
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}
