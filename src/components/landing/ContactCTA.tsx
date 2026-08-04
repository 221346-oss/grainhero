import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { ArrowRight, MessageCircle } from 'lucide-react'

export function ContactCTA() {
  return (
    <section className="bg-[#8FE04B] px-5 py-24 sm:px-8 sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="mx-auto max-w-4xl text-center"
      >
        <MessageCircle className="mx-auto h-10 w-10 text-[#252d26]" />
        <h2 className="mt-6 text-4xl font-black leading-[0.98] tracking-tight text-[#252d26] sm:text-6xl lg:text-7xl">
          Let&apos;s put sensors
          <br />
          in your silos.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg font-medium text-[#252d26]/75">
          Tell us how many silos you run and we&apos;ll size the kit, quote the install and get you
          live this season.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/contact"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#252d26] px-9 py-4 text-base font-bold text-[#EDE9D4] transition-all hover:scale-105 hover:bg-[#2FAC0C]"
          >
            Lets Talk
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center rounded-full border-2 border-[#252d26]/40 px-9 py-4 text-base font-bold text-[#252d26] transition-all hover:scale-105 hover:border-[#252d26]"
          >
            Shop hardware
          </Link>
        </div>
      </motion.div>
    </section>
  )
}