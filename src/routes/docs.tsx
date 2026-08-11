import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { FileText, Download, Code, Terminal, Smartphone, Cloud } from 'lucide-react'
import { NewGlassNav } from '@/components/landing/NewGlassNav'
import { NewFooter } from '@/components/landing/NewFooter'

export const Route = createFileRoute('/docs')({
  head: () => ({
    meta: [
      { title: 'Documentation — GrainHero' },
      {
        name: 'description',
        content: 'Complete technical documentation for GrainHero platform, API references, and integration guides.',
      },
      { property: 'og:title', content: "Documentation — GrainHero" },
      { property: 'og:description', content: "Complete technical documentation for GrainHero platform, API references, and integration guides." },
      { property: 'og:url', content: 'https://grainhero.app/docs' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: 'https://grainhero.app/docs' }],
  }),
  component: DocumentationPage,
})

function DocumentationPage() {
  const docSections = [
    {
      icon: FileText,
      title: 'User Guide',
      description: 'Complete guide to using GrainHero platform features and real-time monitoring.',
      items: ['Dashboard & Analytics', 'Silo & Warehouse Management', 'Alert Configuration', 'Batch Tracking & Reports'],
    },
    {
      icon: Terminal,
      title: 'API Documentation',
      description: 'Server functions and API endpoints for grain storage operations.',
      items: ['Supabase Authentication', 'Sensor Data Endpoints', 'AI Prediction APIs', 'Analytics Functions'],
    },
    {
      icon: Code,
      title: 'ML & AI Integration',
      description: 'Machine learning models for spoilage prediction and anomaly detection.',
      items: ['Python ML Inference', 'Gemini AI Insights', 'Risk Classification Models', 'Real-time Predictions'],
    },
    {
      icon: Smartphone,
      title: 'Platform Features',
      description: 'Core features available in the GrainHero web platform.',
      items: ['Real-time Monitoring', 'Predictive Analytics', 'Insurance & Claims', 'Team Management'],
    },
    {
      icon: Cloud,
      title: 'IoT & Sensor Integration',
      description: 'IoT sensor specifications and data collection protocols.',
      items: ['Temperature & Humidity Sensors', 'Moisture & CO2 Monitoring', 'VOC Detection', 'Firebase Real-time Sync'],
    },
    {
      icon: Download,
      title: 'Data & Reports',
      description: 'Export capabilities and reporting tools for grain storage data.',
      items: ['Batch Analytics', 'Risk Reports', 'Traceability Logs', 'Activity History'],
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
                Documentation
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6">
              Technical <span className="text-[#2FAC0C]">Documentation</span>
            </h1>
            <p className="text-xl text-[#EDE9D4]/80 leading-relaxed">
              Everything you need to know about using and integrating with GrainHero
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 bg-white border-b border-[#2FAC0C]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { name: 'Getting Started', link: '/help' },
              { name: 'API Reference', link: '#' },
              { name: 'Tutorials', link: '/help' },
              { name: 'FAQ', link: '/#faq' },
              { name: 'Support', link: '/contact' },
            ].map((link) => (
              <button
                key={link.name}
                onClick={() => window.location.href = link.link}
                className="px-6 py-2 bg-[#EDE9D4] hover:bg-[#2FAC0C]/10 rounded-full text-[#252d26] font-semibold transition-colors border border-[#2FAC0C]/20"
              >
                {link.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Documentation Sections */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docSections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#EDE9D4] rounded-2xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-[#2FAC0C]/30 cursor-pointer"
              >
                <div className="bg-[#2FAC0C]/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <section.icon className="w-6 h-6 text-[#2FAC0C]" />
                </div>
                <h3 className="text-xl font-bold text-[#252d26] mb-2">{section.title}</h3>
                <p className="text-[#404F44] text-sm mb-4">{section.description}</p>
                <ul className="space-y-1.5">
                  {section.items.map((item) => (
                    <li key={item} className="text-[#404F44] text-sm flex items-center gap-2">
                      <div className="w-1 h-1 bg-[#2FAC0C] rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* API Version Info */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl p-8 border-2 border-[#2FAC0C]/20"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#2FAC0C]/10 px-4 py-2 rounded-full">
                <span className="text-[#2FAC0C] font-bold">v3.2</span>
              </div>
              <h3 className="text-2xl font-black text-[#252d26]">ML Model: Spoilage Risk Classifier</h3>
            </div>
            <p className="text-[#404F44] mb-6">
              GrainHero uses advanced machine learning models including Gradient Boosted Trees for spoilage classification,
              Isolation Forest for anomaly detection, and LSTM networks for yield forecasting. Our AI leverages temperature,
              humidity, moisture, CO₂, VOC, and storage duration data to predict grain spoilage 24-48 hours in advance with high accuracy.
            </p>
            <button className="bg-[#2FAC0C] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#2FAC0C]/90 hover:scale-105 transition-all"
              onClick={() => window.location.href = '/help'}
            >
              View Technical Specs
            </button>
          </motion.div>
        </div>
      </section>

      <NewFooter />
    </main>
  )
}
