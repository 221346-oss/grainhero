import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { NewGlassNav } from '@/components/landing/NewGlassNav'
import { TeamSection } from '@/components/landing/TeamSection'
import { NewFooter } from '@/components/landing/NewFooter'

export const Route = createFileRoute('/team')({
  head: () => ({
    meta: [
      { title: 'Our Team — GrainHero' },
      {
        name: 'description',
        content: 'Meet the founders and team behind GrainHero\'s innovative grain storage solutions.',
      },
    ],
  }),
  component: TeamPage,
})

function TeamPage() {
  return (
    <main className="min-h-screen bg-[#EDE9D4]">
      <NewGlassNav />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-[#252d26] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            style={{
              backgroundImage:
                'radial-gradient(circle at 2px 2px, rgba(47,172,12,0.4) 1px, transparent 0)',
              backgroundSize: '40px 40px',
              width: '100%',
              height: '100%',
            }}
          />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block bg-[#2FAC0C]/10 px-4 py-2 rounded-full mb-6">
              <span className="text-[#2FAC0C] text-sm font-semibold uppercase tracking-wider">
                Meet The Team
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6">
              The Minds Behind <span className="text-[#2FAC0C]">GrainHero</span>
            </h1>
            <p className="text-xl text-[#EDE9D4]/80 leading-relaxed">
              A passionate team dedicated to revolutionizing grain storage with cutting-edge technology
            </p>
          </motion.div>
        </div>
      </section>

      {/* Team Section */}
      <section className="bg-white">
        <TeamSection />
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#252d26]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#EDE9D4] mb-6">
              Want to Join Our Mission?
            </h2>
            <p className="text-xl text-[#EDE9D4]/80 mb-8">
              Get started with GrainHero today and protect your harvest
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  window.location.href = '/checkout'
                }}
                className="bg-[#2FAC0C] text-white font-bold px-10 py-4 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Get Started
              </button>
              <button
                onClick={() => {
                  window.location.href = '/contact'
                }}
                className="bg-transparent border-2 border-[#EDE9D4] text-[#EDE9D4] font-semibold px-10 py-4 rounded-full hover:bg-[#EDE9D4] hover:text-[#252d26] transition-all duration-300"
              >
                Contact Us
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <NewFooter />
    </main>
  )
}
