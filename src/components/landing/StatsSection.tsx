import { motion } from "framer-motion";

const stats = [
  { value: "10,000+", label: "Tons monitored" },
  { value: "99.2%", label: "Prediction accuracy" },
  { value: "50%", label: "Loss reduction" },
  { value: "24/7", label: "Uptime" },
];

export function StatsSection() {
  return (
    <section id="stats-section" className="bg-[#2FA84F] py-16 sm:py-20">
      <div className="gh-stagger mx-auto grid max-w-6xl grid-cols-2 gap-y-12 px-5 sm:px-8 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
            className="border-l border-white/25 px-5 text-left first:border-l-0 lg:px-8"
          >
            <div className="text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
              {s.value}
            </div>
            <p className="mt-3 text-[0.625rem] font-bold uppercase tracking-[0.24em] text-white/70">
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
