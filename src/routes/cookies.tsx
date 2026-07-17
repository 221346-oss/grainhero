import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Cookie, Shield, Settings, Info, Eye, Activity } from 'lucide-react'
import { NewGlassNav } from '@/components/landing/NewGlassNav'
import { NewFooter } from '@/components/landing/NewFooter'

export const Route = createFileRoute('/cookies')({
  head: () => ({
    meta: [
      { title: 'Cookie Policy — GrainHero' },
      {
        name: 'description',
        content: 'GrainHero Cookie Policy. Read about how we use cookies and manage your preferences.',
      },
    ],
  }),
  component: CookiePolicyPage,
})

function CookiePolicyPage() {
  const sections = [
    {
      icon: Info,
      title: 'What Are Cookies?',
      description: 'Cookies are small text files placed on your device to store data that can be recalled by a web server. We use cookies and similar technologies to store and honor your preferences and settings, enable you to sign in, combat fraud, and analyze how our services perform.',
      points: [
        'Cookies help us remember your login session so you don\'t have to re-authenticate constantly',
        'They store custom dashboard configurations and layout settings',
        'We use secure browser cookies that cannot be accessed by external sites',
        'Cookies can be session-based (temporary) or persistent (stored on your device)',
        'Local storage acts as a similar technology to remember theme state',
        'You can configure your browser to block or alert you about these cookies',
      ],
    },
    {
      icon: Shield,
      title: 'Essential Cookies',
      description: 'These cookies are absolutely necessary for the website to function and cannot be switched off in our systems. They are usually only set in response to actions made by you which amount to a request for services, such as setting your privacy preferences, logging in, or filling in forms.',
      points: [
        'Secure authentication tokens to protect user accounts',
        'CSRF security tokens to prevent cross-site request forgery attacks',
        'Session storage to hold operational wizard data during grain batch setup',
        'Storing your dark/light theme choices and sidebar configuration',
        'Billing session IDs for secure Stripe checkout routing',
        'Required system settings for high availability and load balancing',
      ],
    },
    {
      icon: Activity,
      title: 'Performance & Analytics',
      description: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular and see how visitors move around the site.',
      points: [
        'Aggregated traffic statistics using privacy-first analytics tools',
        'Monitoring page load times and network responsiveness',
        'Tracking error rates and boundary violations to improve reliability',
        'Identifying which features are most active (e.g. IoT Sensor dashboard)',
        'Analyzing search queries inside the app search bar',
        'All data is anonymized and pooled for performance analysis only',
      ],
    },
    {
      icon: Settings,
      title: 'Functional Cookies',
      description: 'These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.',
      points: [
        'Remembering your default silo unit settings (metric vs imperial)',
        'Preserving map layout coordinates in sensor view',
        'Remembering notifications mute preferences',
        'Caching recent AI predictions for fast offline-friendly viewing',
        'Enabling live customer support chat windows',
        'If you do not allow these, some services may not function properly',
      ],
    },
    {
      icon: Eye,
      title: 'Marketing & Targeting',
      description: 'These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant adverts on other sites. They do not store directly personal information but are based on uniquely identifying your browser and internet device.',
      points: [
        'Tracking product checkout completions for sales metrics',
        'Analyzing referral links to verify affiliate sales',
        'Syncing registration updates to marketing platforms like HubSpot',
        'Measuring effectiveness of search engine promotional campaigns',
        'Providing feedback on user onboarding tours',
        'If you do not allow these, you will experience less targeted advertising',
      ],
    },
    {
      icon: Cookie,
      title: 'How to Manage Cookies',
      description: 'You have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website, though your access to some functionality and areas of our website may be restricted.',
      points: [
        'Adjust browser settings to block all cookies or notify upon receiving one',
        'Delete existing cookies from your browser history at any time',
        'Opt-out of third-party tracking via designated opt-out portals',
        'Use privacy-focused browsers or extensions to block tracking pixels',
        'Review device settings to limit ad tracking on mobile terminals',
        'Contact our support team for specific data collection questions',
      ],
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
                Transparency
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6">
              Cookie <span className="text-[#2FAC0C]">Policy</span>
            </h1>
            <p className="text-xl text-[#EDE9D4]/80 leading-relaxed">
              We believe in being clear and open about how we collect and use data related to you.
              This policy explains how and why we use cookies on our platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Cookie Sections */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]/40">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {sections.map((section, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-6 sm:p-8 border border-[#2FAC0C]/10 hover:border-[#2FAC0C]/30 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-[#2FAC0C]/10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                    <section.icon className="w-6 h-6 text-[#2FAC0C]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#252d26]">{section.title}</h2>
                </div>
                
                <p className="text-[#404F44] mb-6 text-sm sm:text-base leading-relaxed">
                  {section.description}
                </p>
                
                <ul className="space-y-3 mt-auto">
                  {section.points.map((point, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#404F44]/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2FAC0C] shrink-0 mt-2" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 p-6 sm:p-8 rounded-2xl bg-[#252d26] text-white text-center border-2 border-[#2FAC0C]/20"
          >
            <h3 className="text-xl sm:text-2xl font-bold mb-3">Questions about our Cookie Policy?</h3>
            <p className="text-[#EDE9D4]/80 text-sm sm:text-base max-w-2xl mx-auto mb-6">
              If you have any questions or feedback regarding our use of cookies or this policy,
              please reach out to our privacy compliance officer.
            </p>
            <a
              href="mailto:privacy@grainhero.com"
              className="inline-block bg-[#2FAC0C] text-white font-bold px-6 py-3 rounded-full hover:bg-[#2FAC0C]/90 transition shadow-lg hover:scale-105"
            >
              Contact Privacy Team
            </a>
          </motion.div>
        </div>
      </section>

      <NewFooter />
    </main>
  )
}
