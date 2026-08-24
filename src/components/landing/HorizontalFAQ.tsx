import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const faqs = [
  {
    q: "How does the AI predict spoilage?",
    a: "It flags the pattern that comes before spoilage, 24–48 hours early.",
  },
  { q: "Do I need new silos?", a: "No. The kit retro-fits onto silos you already own." },
  {
    q: "What if the internet drops?",
    a: "The controller buffers 7 days locally and syncs on reconnect.",
  },
  { q: "Can my whole team use it?", a: "Yes — each role gets its own view and alerts." },
  { q: "What does it cost to start?", a: "Start with hardware. The dashboard is included." },
];

export function HorizontalFAQ() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["2%", "-68%"]);
  const bar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const hint = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <section id="faq" ref={ref} className="relative h-[240vh] bg-[#111512]">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-10 w-full max-w-7xl px-5 sm:px-8">
          <h2 className="text-[1.75rem] font-black tracking-tight text-[#FAFAF7] sm:text-4xl">
            Everything worth asking.
          </h2>
        </div>

        <motion.div style={{ x }} className="flex gap-4 px-5 sm:px-8">
          {faqs.map((f) => (
            <div
              key={f.q}
              className="group relative flex h-[220px] w-[260px] shrink-0 flex-col justify-between rounded-2xl border border-[#FAFAF7]/12 bg-[#1A201B] p-6 transition-colors duration-300 hover:border-[#A8E6A1]/50 hover:bg-[#222B23] sm:w-[320px]"
            >
              <div>
                <h3 className="text-base font-black leading-tight text-[#FAFAF7] sm:text-lg">
                  {f.q}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#FAFAF7]/65">{f.a}</p>
              </div>
              <div className="h-1 w-8 rounded-full bg-[#A8E6A1] transition-all duration-300 group-hover:w-20" />
            </div>
          ))}
        </motion.div>

        <div className="mx-auto mt-10 h-1 w-full max-w-7xl overflow-hidden rounded-full bg-[#FAFAF7]/10 px-5">
          <motion.div style={{ width: bar }} className="h-full rounded-full bg-[#A8E6A1]" />
        </div>

        <motion.div
          style={{ opacity: hint }}
          aria-hidden="true"
          className="mx-auto mt-5 flex w-full max-w-7xl items-center gap-2 px-5 sm:px-8"
        >
          <motion.svg
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#A8E6A1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </motion.svg>
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#FAFAF7]/45">
            Swipe down to explore
          </span>
        </motion.div>
      </div>
    </section>
  );
}
