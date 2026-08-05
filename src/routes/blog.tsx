import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { NewGlassNav } from '@/components/landing/NewGlassNav'
import { NewFooter } from '@/components/landing/NewFooter'

export const Route = createFileRoute('/blog')({
  head: () => ({
    meta: [
      { title: 'Blog — GrainHero' },
      {
        name: 'description',
        content: 'Stay updated with the latest news, tips, and insights about grain storage technology and agriculture.',
      },
      { property: 'og:title', content: "Blog — GrainHero" },
      { property: 'og:description', content: "Stay updated with the latest news, tips, and insights about grain storage technology and agriculture." },
      { property: 'og:url', content: 'https://grainhero.app/blog' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: 'https://grainhero.app/blog' }],
  }),
  component: BlogPage,
})

// Sample blog posts data
const blogPosts = [
  {
    id: 1,
    title: '5 Signs Your Grain Storage Needs Better Monitoring',
    excerpt: 'Learn the warning signs that indicate your grain storage facility could benefit from automated IoT monitoring systems.',
    category: 'Best Practices',
    date: '2026-07-10',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format',
  },
  {
    id: 2,
    title: 'How AI Predicts Grain Spoilage Before It Happens',
    excerpt: 'Discover the machine learning algorithms behind GrainHero\'s predictive analytics and how they save farmers millions.',
    category: 'Technology',
    date: '2026-07-08',
    readTime: '8 min read',
    image: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=800&auto=format',
  },
  {
    id: 3,
    title: 'The True Cost of Grain Spoilage in 2026',
    excerpt: 'An in-depth analysis of post-harvest losses and how modern technology is changing the economics of grain storage.',
    category: 'Industry Insights',
    date: '2026-07-05',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format',
  },
  {
    id: 4,
    title: 'IoT Sensors: Your First Line of Defense',
    excerpt: 'Understanding the different types of sensors used in grain monitoring and how they work together.',
    category: 'Technology',
    date: '2026-07-01',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format',
  },
  {
    id: 5,
    title: 'Customer Success Story: Reducing Losses by 35%',
    excerpt: 'How Johnson Farms implemented GrainHero and transformed their grain storage operations.',
    category: 'Case Study',
    date: '2026-06-28',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format',
  },
  {
    id: 6,
    title: 'Summer Storage Tips: Keeping Grain Cool',
    excerpt: 'Expert advice on maintaining optimal storage conditions during the hot summer months.',
    category: 'Best Practices',
    date: '2026-06-25',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format',
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
            <div className="inline-block bg-[#2FAC0C]/10 px-4 py-2 rounded-full mb-6">
              <span className="text-[#2FAC0C] text-sm font-semibold uppercase tracking-wider">
                Knowledge Hub
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6">
              GrainHero <span className="text-[#2FAC0C]">Blog</span>
            </h1>
            <p className="text-xl text-[#EDE9D4]/80 leading-relaxed">
              Insights, tips, and updates from the world of smart grain storage
            </p>
          </motion.div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#2FAC0C]/10 group cursor-pointer hover:scale-105"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-[#EDE9D4]">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2FAC0C]/20 to-transparent" />
                  <div className="absolute top-4 left-4 bg-[#2FAC0C] text-white text-xs font-bold px-3 py-1 rounded-full">
                    {post.category}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-4 text-xs text-[#404F44]/60 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-[#252d26] mb-2 group-hover:text-[#2FAC0C] transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-[#404F44] text-sm leading-relaxed mb-4">
                    {post.excerpt}
                  </p>

                  <button className="text-[#2FAC0C] font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                    Read More
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Load More */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-12"
          >
            <button className="bg-[#2FAC0C] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#2FAC0C]/90 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              Load More Articles
            </button>
          </motion.div>
        </div>
      </section>

        <NewFooter />
    </main>
  )
}
