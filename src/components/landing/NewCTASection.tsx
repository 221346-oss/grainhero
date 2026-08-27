import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { LocalizedContent } from "@/i18n";

export function NewCTASection() {
  return (
    <LocalizedContent><section className="relative py-14 sm:py-20 overflow-hidden bg-[#111512]">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
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

      {/* Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2FA84F]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#2FA84F]/10 rounded-full blur-2xl" />

      <div className="container mx-auto px-4 text-center relative z-10 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-block bg-[#2FA84F]/10 px-4 py-2 rounded-full mb-6">
            <span className="text-[#2FA84F] text-sm font-semibold uppercase tracking-wider">
              Start Today
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#FAFAF7] mb-6 leading-tight">
            Ready to Optimize Your
            <br />
            <span className="text-[#2FA84F]">Grain Storage?</span>
          </h2>

          {/* Description */}
          <p className="text-xl text-[#FAFAF7]/70 mb-10 max-w-3xl mx-auto leading-relaxed">
            Join thousands of farmers and grain operators who trust GrainHero to protect their
            harvest and maximize profits with AI-powered monitoring.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/checkout"
              className="group bg-[#2FA84F] text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-[#2FA84F]/90 transition-all duration-300 cursor-pointer shadow-2xl hover:shadow-[#2FA84F]/30 hover:scale-105 flex items-center gap-2"
            >
              View Plans & Pricing
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={() => {
                window.location.href = "mailto:grainhero@gmail.com?subject=Schedule Demo Request";
              }}
              className="bg-transparent border-2 border-[#FAFAF7]/30 text-[#FAFAF7] px-10 py-4 rounded-full text-lg font-semibold hover:bg-[#FAFAF7]/10 hover:border-[#FAFAF7] transition-all duration-300 hover:scale-105"
            >
              Schedule Demo
            </button>
          </div>

          {/* Trust Badge */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-[#FAFAF7]/50 text-sm mt-8"
          >
            Trusted by 10,000+ farmers worldwide
          </motion.p>
        </motion.div>
      </div>
    </section></LocalizedContent>
  );
}
