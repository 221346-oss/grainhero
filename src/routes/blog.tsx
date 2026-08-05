import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { NewGlassNav } from '@/components/landing/NewGlassNav'
import { NewFooter } from '@/components/landing/NewFooter'

export const Route = createFileRoute('/blog')({
  head: () => ({
    meta: [
      { title: 'Resources — Grain Storage Guides & Monitoring Explainers | GrainHero' },
      {
        name: 'description',
        content:
          'Practical guides on grain storage: safe moisture and temperature by grain type, how silo monitoring hardware works, and what grain management software should cover.',
      },
      { property: 'og:title', content: 'Resources — Grain Storage Guides & Monitoring Explainers' },
      {
        property: 'og:description',
        content:
          'Practical guides on grain storage: safe moisture and temperature by grain type, how silo monitoring hardware works, and what grain management software should cover.',
      },
      { property: 'og:url', content: 'https://grainhero.app/blog' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: 'https://grainhero.app/blog' }],
  }),
  component: BlogPage,
})

const resources = [
  {
    to: '/guides/grain-storage',
    category: 'Guide',
    title: 'Grain storage: what actually keeps a harvest sellable',
    excerpt:
      'Safe moisture and temperature by grain type, how hot spots and moisture migration start, when to run aeration, and a full storage-season checklist.',
  },
  {
    to: '/solutions/grain-storage-monitoring',
    category: 'Explainer',
    title: 'Grain storage monitoring, end to end',
    excerpt:
      'What continuous monitoring measures and where, why manual probing misses the early stage, and how a reading turns into an alert and an action.',
  },
  {
    to: '/solutions/silo-monitoring-system',
    category: 'Hardware',
    title: 'Inside a silo monitoring system',
    excerpt:
      'Probe cables, sensor spacing by silo size, LoRa gateways, offline buffering, power options and what installation day looks like.',
  },
  {
    to: '/solutions/grain-management-software',
    category: 'Software',
    title: 'What grain management software should cover',
    excerpt:
      'Batch traceability, silo inventory, role-based access for owners, managers and technicians, and export-ready condition reporting.',
  },
]

function BlogPage() {
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
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6">
              GrainHero <span className="text-[#2FAC0C]">resources</span>
            </h1>
            <p className="text-xl text-[#EDE9D4]/80 leading-relaxed">
              Practical guides on storing grain well and the technology that keeps it that way
            </p>
          </motion.div>
        </div>
      </section>

      {/* Resource Grid */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2">
            {resources.map((post, index) => (
              <motion.article
                key={post.to}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
              >
                <Link
                  to={post.to}
                  className="group block h-full rounded-2xl border border-[#2FAC0C]/15 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#2FAC0C] hover:shadow-xl"
                >
                  <span className="inline-block rounded-full bg-[#2FAC0C]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#2FAC0C]">
                    {post.category}
                  </span>
                  <h2 className="mt-4 text-xl font-bold text-[#252d26] transition-colors group-hover:text-[#2FAC0C]">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#404F44]">{post.excerpt}</p>
                  <span className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#2FAC0C] transition-all group-hover:gap-3">
                    Read
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

        <NewFooter />
    </main>
  )
}
