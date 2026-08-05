import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Target, Heart, Users, Award } from 'lucide-react'
import { NewGlassNav } from '@/components/landing/NewGlassNav'
import { NewFooter } from '@/components/landing/NewFooter'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: 'About Us — GrainHero' },
      {
        name: 'description',
        content: 'Learn about GrainHero\'s mission to revolutionize grain storage with AI-powered technology.',
      },
      { property: 'og:title', content: "About Us — GrainHero" },
      { property: 'og:description', content: "Learn about GrainHero's mission to revolutionize grain storage with AI-powered technology." },
      { property: 'og:url', content: 'https://grainhero.app/about' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: 'https://grainhero.app/about' }],
  }),
  component: AboutPage,
})

function AboutPage() {
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
                Our Story
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6">
              About <span className="text-[#2FAC0C]">GrainHero</span>
            </h1>
            <p className="text-xl text-[#EDE9D4]/80 leading-relaxed">
              Revolutionizing grain storage with AI-powered technology to protect harvests
              and empower farmers worldwide.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-[#EDE9D4] rounded-2xl p-8 border-2 border-[#2FAC0C]/20 hover:scale-105 transition-all duration-300"
            >
              <div className="bg-[#2FAC0C]/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-[#2FAC0C]" />
              </div>
              <h2 className="text-3xl font-black text-[#252d26] mb-4">Our Mission</h2>
              <p className="text-[#404F44] text-lg leading-relaxed">
                To eliminate grain spoilage and post-harvest losses by providing farmers
                and grain operators with intelligent, accessible, and affordable IoT
                monitoring solutions powered by artificial intelligence.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-[#EDE9D4] rounded-2xl p-8 border-2 border-[#2FAC0C]/20 hover:scale-105 transition-all duration-300"
            >
              <div className="bg-[#2FAC0C]/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                <Heart className="w-8 h-8 text-[#2FAC0C]" />
              </div>
              <h2 className="text-3xl font-black text-[#252d26] mb-4">Our Vision</h2>
              <p className="text-[#404F44] text-lg leading-relaxed">
                A world where no grain is lost to preventable spoilage. Where every farmer
                has access to enterprise-grade technology that protects their harvest and
                maximizes their livelihood.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#252d26] mb-6">
              Our <span className="text-[#2FAC0C]">Story</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="prose prose-lg max-w-none"
          >
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#2FAC0C]/10">
              <p className="text-[#404F44] leading-relaxed mb-4">
                GrainHero was born from a simple observation: billions of dollars worth of grain
                are lost every year to spoilage, despite existing technology that could prevent it.
              </p>
              <p className="text-[#404F44] leading-relaxed mb-4">
                Our founders—combining expertise in agriculture, software engineering, IoT systems,
                and artificial intelligence—came together with a shared mission: make enterprise-grade
                grain monitoring accessible to every farmer, regardless of their operation's size.
              </p>
              <p className="text-[#404F44] leading-relaxed mb-4">
                What started as a university research project quickly evolved into a full-fledged
                platform serving thousands of farmers worldwide. Today, GrainHero monitors millions
                of bushels of grain, preventing spoilage and protecting livelihoods across continents.
              </p>
              <p className="text-[#404F44] leading-relaxed">
                We're not just building software—we're building a future where technology empowers
                agriculture, where data drives decisions, and where no harvest is lost to preventable
                causes.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#252d26] mb-4">
              Our <span className="text-[#2FAC0C]">Values</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Users,
                title: 'Farmer-First',
                description: 'Every decision starts with how it benefits the farmers we serve.',
              },
              {
                icon: Award,
                title: 'Innovation',
                description: 'We push boundaries with cutting-edge AI and IoT technology.',
              },
              {
                icon: Target,
                title: 'Accessibility',
                description: 'Enterprise solutions should be available to farms of all sizes.',
              },
              {
                icon: Heart,
                title: 'Sustainability',
                description: 'Reducing food waste contributes to a more sustainable planet.',
              },
            ].map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#EDE9D4] rounded-2xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <div className="bg-[#2FAC0C]/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-[#2FAC0C]" />
                </div>
                <h3 className="text-xl font-bold text-[#252d26] mb-2">{value.title}</h3>
                <p className="text-[#404F44] text-sm">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
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
              Join Us in Our Mission
            </h2>
            <p className="text-xl text-[#EDE9D4]/80 mb-8">
              Be part of the revolution in grain storage technology
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  window.location.href = '/checkout'
                }}
                className="bg-[#2FAC0C] text-white font-bold px-10 py-4 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                View Plans
              </button>
              <button
                onClick={() => {
                  window.location.href = '/contact'
                }}
                className="bg-transparent border-2 border-[#EDE9D4] text-[#EDE9D4] font-semibold px-10 py-4 rounded-full hover:bg-[#EDE9D4] hover:text-[#252d26] hover:scale-105 transition-all duration-300"
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
