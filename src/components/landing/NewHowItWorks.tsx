import { motion } from 'framer-motion'
import { Wrench, Wifi, LineChart, CheckCircle } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Wrench,
    title: 'Install IoT Sensors',
    description:
      'Quick and easy setup in your storage facility. Our weatherproof sensors mount in minutes and connect wirelessly to your network.',
    details: ['Temperature sensors', 'Humidity monitors', 'Moisture detectors', 'CO₂ level sensors'],
    image: '/images/how-it-works/Step-01.jpg',
  },
  {
    number: '02',
    icon: Wifi,
    title: 'Connect to Platform',
    description:
      'Sensors automatically sync with our cloud platform via Wi-Fi or cellular connection. Real-time data streams to your dashboard instantly.',
    details: ['Automatic cloud sync', 'Secure encryption', 'Mobile & web access', 'Instant notifications'],
    image: '/images/how-it-works/Step-02.jpg',
  },
  {
    number: '03',
    icon: LineChart,
    title: 'Monitor & Optimize',
    description:
      'AI analyzes your data 24/7, predicting issues before they occur. Get actionable insights and automated alerts to protect your grain.',
    details: ['AI predictions', 'Real-time alerts', 'Historical analytics', 'Automated reports'],
    image: '/images/features/Analytics_Dashboard.png',
  },
]

export function NewHowItWorks() {
  return (
    <section id="how-it-works" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-[#2FAC0C]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#2FAC0C]/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-12"
        >
          <div className="inline-block bg-[#2FAC0C]/10 px-4 py-2 rounded-full mb-3">
            <span className="text-[#2FAC0C] text-sm font-semibold uppercase tracking-wider">
              Simple Setup Process
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#252d26] mb-4">
            Get Started in <span className="text-[#2FAC0C]">3 Simple Steps</span>
          </h2>
          <p className="text-lg sm:text-xl text-[#404F44] max-w-3xl mx-auto">
            From installation to optimization in less than 2 hours
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-12 sm:space-y-16">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className={`flex flex-col ${
                index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
              } items-center gap-8 lg:gap-12`}
            >
              {/* Content */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-6xl sm:text-7xl font-black text-[#2FAC0C]">
                    {step.number}
                  </span>
                  <div className="bg-[#2FAC0C]/10 p-4 rounded-xl">
                    <step.icon className="w-8 h-8 text-[#2FAC0C]" />
                  </div>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-[#252d26]">
                  {step.title}
                </h3>
                <p className="text-[#404F44] text-lg leading-relaxed">
                  {step.description}
                </p>
                <ul className="space-y-2 pt-2">
                  {step.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-[#404F44]">
                      <CheckCircle className="w-5 h-5 text-[#2FAC0C] flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual Placeholder */}
              <div className="flex-1 w-full max-w-md">
                <div className="aspect-square bg-white rounded-2xl flex items-center justify-center border-2 border-[#2FAC0C]/20 shadow-lg overflow-hidden">
                  <img 
                    src={step.image}
                    alt={step.title}
                    className="w-full h-full object-cover"
                    style={step.number === '01' ? { width: '85%', height: '85%', objectFit: 'contain' } : {}}
                    onError={(e) => {
                      // Fallback to icon if image not found
                      e.currentTarget.style.display = 'none'
                      const parent = e.currentTarget.parentElement
                      if (parent) {
                        parent.classList.add('bg-gradient-to-br', 'from-[#2FAC0C]/10', 'to-[#2FAC0C]/5')
                      }
                    }}
                  />
                  <step.icon className="hidden w-24 h-24 text-[#2FAC0C]/30" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-10"
        >
          <button
            onClick={() => {
              window.location.href = '/checkout'
            }}
            className="bg-[#2FAC0C] text-white font-bold px-10 py-4 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            View Plans & Pricing
          </button>
        </motion.div>
      </div>
    </section>
  )
}
