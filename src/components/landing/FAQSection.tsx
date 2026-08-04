import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'

const faqs = [
  {
    question: 'How does the AI predict grain spoilage?',
    answer:
      'Our machine learning algorithms analyze historical data from thousands of silos, combining temperature, humidity, moisture content, and CO₂ levels. The AI identifies patterns that precede spoilage and alerts you 24-48 hours before issues become critical, giving you time to take preventive action.',
  },
  {
    question: 'What sensors are included in the system?',
    answer:
      'Each GrainHero kit includes temperature sensors, humidity monitors, moisture detectors, and CO₂ level sensors. All sensors are industrial-grade, weatherproof, and designed specifically for grain storage environments. Installation takes less than 2 hours with our guided setup.',
  },
  {
    question: 'Can I monitor multiple silos or locations?',
    answer:
      'Yes! GrainHero supports unlimited silos and multiple locations on a single dashboard. You can switch between facilities instantly, set location-specific alerts, and generate comparative reports across all your storage sites.',
  },
  {
    question: 'Is there a mobile app available?',
    answer:
      'Absolutely. GrainHero offers native mobile apps for both iOS and Android, plus a responsive web application. Access real-time data, receive push notifications, and control your systems from anywhere in the world.',
  },
  {
    question: 'What is the installation process like?',
    answer:
      'Installation is straightforward: mount sensors in your silos, connect to power and Wi-Fi, and activate through our app. Most customers complete setup in under 2 hours. We provide video tutorials, and our support team offers live assistance if needed.',
  },
  {
    question: 'Do you offer training and support?',
    answer:
      'Yes! Every plan includes comprehensive onboarding, video tutorials, and 24/7 customer support. Professional and Enterprise plans include personalized training sessions and a dedicated account manager to ensure your success.',
  },
  {
    question: 'What happens if internet connectivity is lost?',
    answer:
      'Our sensors have local storage that buffers data for up to 7 days. When connectivity is restored, all data syncs automatically. Critical alerts can also be delivered via SMS to ensure you never miss important notifications.',
  },
  {
    question: 'How accurate are the spoilage predictions?',
    answer:
      'Our AI maintains a 95% accuracy rate in predicting spoilage events 24-48 hours in advance. The system continuously learns from your specific storage conditions, improving accuracy over time for your unique environment.',
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#FAFAF7]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#111512] mb-4">
            Frequently Asked <span className="text-[#2FA84F]">Questions</span>
          </h2>
          <p className="text-lg text-[#4A554C]">
            Everything you need to know about GrainHero
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm border border-[#2FA84F]/10 overflow-hidden hover:scale-105 transition-transform duration-300"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#2FA84F]/5 transition-colors"
              >
                <span className="text-[#111512] font-bold text-base sm:text-lg pr-4">
                  {faq.question}
                </span>
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full bg-[#2FA84F]/10 flex items-center justify-center transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                >
                  {openIndex === index ? (
                    <Minus className="w-5 h-5 text-[#2FA84F]" />
                  ) : (
                    <Plus className="w-5 h-5 text-[#2FA84F]" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-[#4A554C] leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 text-center p-8 bg-white rounded-2xl border border-[#2FA84F]/20"
        >
          <h3 className="text-xl font-bold text-[#111512] mb-2">
            Still have questions?
          </h3>
          <p className="text-[#4A554C] mb-4">
            Our team is here to help you get started
          </p>
          <button
            onClick={() => {
              window.location.href = '/contact'
            }}
            className="bg-[#2FA84F] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#2FA84F]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            Contact Support
          </button>
        </motion.div>
      </div>
    </section>
  )
}
