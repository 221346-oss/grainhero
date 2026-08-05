import { motion } from 'framer-motion'
import { TrendingDown, Clock, DollarSign, Shield, ArrowUpRight, Zap } from 'lucide-react'

const benefits = [
  {
    icon: TrendingDown,
    title: 'Reduce Grain Losses',
    description: 'Prevent up to 30% of spoilage with AI-powered predictive analytics that detect issues before they become critical.',
    stat: '30%',
    statLabel: 'Loss Reduction',
  },
  {
    icon: Clock,
    title: 'Save Time Daily',
    description: 'Automated 24/7 monitoring eliminates manual checks. Spend less time worrying and more time growing your business.',
    stat: '24/7',
    statLabel: 'Auto Monitoring',
  },
  {
    icon: DollarSign,
    title: 'Increase Profits',
    description: 'Optimize storage conditions to maintain grain quality longer, commanding premium prices at market.',
    stat: '+25%',
    statLabel: 'Profit Increase',
  },
  {
    icon: Shield,
    title: 'Peace of Mind',
    description: 'Real-time alerts notify you instantly of any issues. Sleep soundly knowing your harvest is protected.',
    stat: '99.9%',
    statLabel: 'Uptime',
  },
  {
    icon: Zap,
    title: 'Quick ROI',
    description: 'Most customers see return on investment within the first harvest season from reduced losses alone.',
    stat: '6mo',
    statLabel: 'Avg. ROI',
  },
  {
    icon: ArrowUpRight,
    title: 'Scale Easily',
    description: 'Start with one silo and expand to manage multiple locations from a single dashboard as you grow.',
    stat: '∞',
    statLabel: 'Scalability',
  },
]

export function BenefitsSection() {
  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#FAFAF7]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#111512] mb-4">
            Why Farmers Trust <span className="text-[#2FA84F]">GrainHero</span>
          </h2>
          <p className="text-lg sm:text-xl text-[#4A554C] max-w-3xl mx-auto">
            Join thousands of grain operators who have transformed their storage operations with intelligent monitoring
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-[#2FA84F]/10 hover:border-[#2FA84F]/30 hover:scale-105 group"
            >
              {/* Icon Only */}
              <div className="flex items-start mb-4">
                <div className="bg-[#2FA84F]/10 p-3 rounded-xl group-hover:bg-[#2FA84F]/20 transition-colors">
                  <benefit.icon className="w-6 h-6 text-[#2FA84F]" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-[#111512] mb-2">{benefit.title}</h3>
              <p className="text-[#4A554C] text-sm leading-relaxed">{benefit.description}</p>
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
            className="bg-[#2FA84F] text-white font-bold px-10 py-4 rounded-full hover:bg-[#2FA84F]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            View Plans & Pricing
          </button>
        </motion.div>
      </div>
    </section>
  )
}
