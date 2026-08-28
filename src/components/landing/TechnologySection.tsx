import { motion } from "framer-motion";
import { Cpu, Cloud, Smartphone, Zap, Wifi, Brain } from "lucide-react";
import { LocalizedContent } from "@/i18n";

const techFeatures = [
  {
    icon: Cpu,
    title: "IoT Sensor Network",
    description:
      "Advanced sensors monitor temperature, humidity, CO₂ levels, and moisture content in real-time.",
  },
  {
    icon: Brain,
    title: "Machine Learning AI",
    description:
      "Predictive algorithms analyze patterns to forecast spoilage risks before they occur.",
  },
  {
    icon: Cloud,
    title: "Cloud Platform",
    description:
      "Secure cloud infrastructure ensures your data is always accessible from anywhere.",
  },
  {
    icon: Smartphone,
    title: "Mobile & Web Apps",
    description: "Monitor your silos on-the-go with intuitive mobile and web applications.",
  },
  {
    icon: Wifi,
    title: "Real-Time Sync",
    description: "Low-latency data transmission ensures you always have the latest information.",
  },
  {
    icon: Zap,
    title: "Automated Control",
    description: "Integrate with ventilation and cooling systems for automated climate control.",
  },
];

export function TechnologySection() {
  return (
    <LocalizedContent><section
      id="technology"
      className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#111512] relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, rgba(47,172,12,0.4) 1px, transparent 0)",
            backgroundSize: "40px 40px",
            width: "100%",
            height: "100%",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="inline-block bg-[#2FA84F]/10 px-4 py-2 rounded-full mb-3">
            <span className="text-[#2FA84F] text-sm font-semibold uppercase tracking-wider">
              Cutting-Edge Technology
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#FAFAF7] mb-4">
            Powered by Advanced <span className="text-[#2FA84F]">IoT & AI</span>
          </h2>
          <p className="text-lg sm:text-xl text-[#FAFAF7]/70 max-w-3xl mx-auto">
            Enterprise-grade technology designed specifically for grain storage management
          </p>
        </motion.div>

        {/* Tech Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {techFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-[#111512]/50 backdrop-blur-sm border border-[#2FA84F]/20 rounded-2xl p-6 hover:border-[#2FA84F]/50 transition-all duration-300 hover:transform hover:-translate-y-2 hover:scale-105 group"
            >
              <div className="bg-[#2FA84F]/10 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#2FA84F]/20 transition-colors">
                <feature.icon className="w-7 h-7 text-[#2FA84F]" />
              </div>
              <h3 className="text-xl font-bold text-[#FAFAF7] mb-2">{feature.title}</h3>
              <p className="text-[#FAFAF7]/70 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section></LocalizedContent>
  );
}
