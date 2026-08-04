import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

export function ContactCTA() {
  return (
    <section className="gh-grain relative bg-[#A8E6A1] px-5 py-24 sm:px-8 sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-4xl text-center"
      >
        <h2 className="text-4xl font-black leading-[0.95] tracking-tight text-[#111512] sm:text-6xl lg:text-7xl">
          Let&apos;s put sensors
          <br />
          in your silos.
        </h2>
        <p className="mx-auto mt-6 max-w-md text-base font-medium text-[#111512]/70">
          Tell us how many silos you run. We&apos;ll size the kit and get you live this season.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            to="/contact"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#111512] px-9 py-4 text-base font-bold text-[#FAFAF7] transition-all duration-300 hover:bg-[#2FA84F]"
          >
            Let&apos;s talk
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </motion.div>
    </section>
  )
}