import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import heroLoop from "@/assets/silo-ai-loop-v3-web.mp4.asset.json";
import heroPoster from "@/assets/landing/hero-poster.jpg";
import { getAssetUrl } from "@/lib/utils";

export function AgriHero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  return (
    <div className="relative min-h-[92svh] w-full overflow-hidden bg-[#111512] sm:min-h-[100svh]">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-105 object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={heroPoster}
      >
        <source src={getAssetUrl(heroLoop)} type="video/mp4" />
      </video>

      {/* Cinematic grade — dark top for nav, bone bottom to hand off to the next section */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#111512]/70 via-[#111512]/25 to-[#111512]/85" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#FAFAF7] to-transparent dark:from-background" />

      {/* Copy */}
      <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-7xl items-center px-5 text-left sm:min-h-[100svh] sm:px-8 lg:px-12">
        <div className="max-w-4xl translate-y-12 pb-16 sm:pb-20 sm:translate-y-16">
          <motion.h1
            initial={{ opacity: 0, y: 26, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.1, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="text-[2.75rem] font-black leading-[0.92] tracking-tight text-[#FAFAF7] sm:text-6xl lg:text-7xl"
          >
            The Future of
            <br />
            <span className="bg-gradient-to-r from-[#A8E6A1] to-[#2FA84F] bg-clip-text text-transparent">
              Grain Storage
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8 }}
            className="mt-10 flex justify-start"
          >
            <Link
              to="/contact"
              className="gh-keep-light group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#FAFAF7] px-7 py-3.5 text-sm font-bold text-[#111512] transition-all duration-300 hover:bg-[#2FA84F] hover:text-white"
            >
              Let&apos;s talk
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
