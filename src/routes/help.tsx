import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Search, MessageCircle, Book, Video, Mail, Phone } from 'lucide-react'
import { NewGlassNav } from '@/components/landing/NewGlassNav'
import { NewFooter } from '@/components/landing/NewFooter'

export const Route = createFileRoute('/help')({
  head: () => ({
    meta: [
      { title: 'Help Center — GrainHero' },
      {
        name: 'description',
        content: 'Get help and support for GrainHero. Find answers, tutorials, and contact our support team.',
      },
    ],
  }),
  component: HelpCenterPage,
})

function HelpCenterPage() {
  const helpCategories = [
    {
      icon: Book,
      title: 'Getting Started',
      description: 'Learn the basics of GrainHero and set up your first silo monitoring system.',
      topics: ['Installation Guide', 'First-Time Setup', 'Quick Start Tutorial', 'Mobile App Basics'],
    },
    {
      icon: Video,
      title: 'Video Tutorials',
      description: 'Watch step-by-step video guides covering all aspects of the platform.',
      topics: ['Sensor Installation', 'Dashboard Overview', 'Alert Configuration', 'Report Generation'],
    },
    {
      icon: MessageCircle,
      title: 'FAQs',
      description: 'Find quick answers to the most commonly asked questions.',
      topics: ['Billing & Pricing', 'Technical Support', 'Account Management', 'Features & Capabilities'],
    },
    {
      icon: Search,
      title: 'Troubleshooting',
      description: 'Resolve common issues and technical problems quickly.',
      topics: ['Connection Issues', 'Sensor Calibration', 'Alert Problems', 'Data Sync Issues'],
    },
  ]

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
                Help Center
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6">
              How Can We <span className="text-[#2FAC0C]">Help You?</span>
            </h1>
            <p className="text-xl text-[#EDE9D4]/80 leading-relaxed mb-8">
              Find answers, tutorials, and get support for all your GrainHero needs
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <input
                type="text"
                placeholder="Search for help articles..."
                className="w-full px-6 py-4 pl-14 rounded-full bg-white/10 backdrop-blur-md border-2 border-[#2FAC0C]/30 text-[#EDE9D4] placeholder-[#EDE9D4]/50 focus:outline-none focus:border-[#2FAC0C] transition-all"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2FAC0C]" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {helpCategories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#EDE9D4] rounded-2xl p-6 sm:p-8 hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-[#2FAC0C]/30"
              >
                <div className="bg-[#2FAC0C]/10 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                  <category.icon className="w-7 h-7 text-[#2FAC0C]" />
                </div>
                <h3 className="text-2xl font-bold text-[#252d26] mb-2">{category.title}</h3>
                <p className="text-[#404F44] mb-4">{category.description}</p>
                <ul className="space-y-2">
                  {category.topics.map((topic) => (
                    <li key={topic} className="text-[#404F44] text-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#2FAC0C] rounded-full" />
                      {topic}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-black text-[#252d26] mb-4">
              Still Need Help?
            </h2>
            <p className="text-lg text-[#404F44] mb-8">
              Our support team is here to assist you 24/7
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="bg-[#2FAC0C] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Contact Support
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <NewFooter />
    </main>
  )
}
