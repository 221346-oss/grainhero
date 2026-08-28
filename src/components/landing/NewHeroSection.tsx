import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Wheat, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { LocalizedContent } from "@/i18n";

export function NewHeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0;
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;

      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, []);

  return (
    <LocalizedContent><div className="relative min-h-screen w-full overflow-hidden bg-[#111512]">
      {/* Background Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        autoPlay
        muted
        loop
        playsInline
        poster="/images/grain-fields-hero.jpg"
      >
        <source
          src="https://videos.pexels.com/video-files/4702791/4702791-uhd_2560_1440_25fps.mp4"
          type="video/mp4"
        />
      </video>

      {/* Enhanced Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#111512] via-[#111512]/95 to-[#111512]/90" />

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-[#2FA84F]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-[#2FA84F]/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Floating Wheat Icons - More Subtle */}
      <Wheat className="absolute top-32 left-10 w-12 h-12 text-[#2FA84F]/10 animate-float" />
      <Wheat className="absolute top-1/4 right-16 w-16 h-16 text-[#2FA84F]/10 animate-float-delay-1" />
      <Wheat className="absolute bottom-32 left-1/4 w-10 h-10 text-[#2FA84F]/10 animate-float-delay-2" />

      {/* Hero Content - Centered */}
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-5xl mx-auto text-center">
            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1] mb-6"
            >
              <span className="text-[#FAFAF7] block">SMART GRAIN</span>
              <span className="text-[#FAFAF7] block">STORAGE</span>
              <span className="text-[#2FA84F] block mt-2">Powered by AI</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-[#FAFAF7]/80 text-xl sm:text-2xl leading-relaxed mb-10 max-w-3xl mx-auto"
            >
              Real-time IoT monitoring and predictive AI analytics that prevent spoilage, reduce
              losses, and maximize your profits.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-3 justify-center "
            >
              <Link
                to="/checkout"
                className="group bg-[#2FA84F] text-white font-bold px-10 py-4 rounded-full hover:bg-[#2FA84F]/90 transition-all duration-300 shadow-2xl hover:shadow-[#2FA84F]/50 hover:scale-105 flex items-center justify-center gap-2 text-lg"
              >
                View Plans & Pricing
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => {
                  const el = document.querySelector("#how-it-works");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-transparent border-2 border-[#FAFAF7] text-[#FAFAF7] font-semibold px-10 py-4 rounded-full hover:bg-[#FAFAF7] hover:text-[#111512] transition-all duration-300 text-lg hover:scale-105"
              >
                See How It Works
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div></LocalizedContent>
  );
}
