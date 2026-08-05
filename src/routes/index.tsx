import { createFileRoute } from '@tanstack/react-router'
import { NewGlassNav } from '@/components/landing/NewGlassNav'
import { AgriHero } from '@/components/landing/AgriHero'
import { ProblemMarquee } from '@/components/landing/ProblemMarquee'
import { SimpleSteps } from '@/components/landing/SimpleSteps'
import { HardwareSection } from '@/components/landing/HardwareSection'
import { AdShowcase } from '@/components/landing/AdShowcase'
import { PartnersStrip } from '@/components/landing/PartnersStrip'
import { HorizontalFAQ } from '@/components/landing/HorizontalFAQ'
import { ContactCTA } from '@/components/landing/ContactCTA'
import { StatsSection } from '@/components/landing/StatsSection'
import { NewFooter } from '@/components/landing/NewFooter'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'GrainHero — AI-Powered Grain Storage Management' },
      {
        name: 'description',
        content:
          "Monitor, predict, and optimize your grain storage with GrainHero's intelligent SaaS platform. AI-powered spoilage prediction, IoT sensors, and real-time analytics.",
      },
      { property: 'og:title', content: 'GrainHero — Smart Grain Storage, Powered by AI' },
      {
        property: 'og:description',
        content:
          'AI-powered grain storage management platform with real-time monitoring and predictive analytics.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://grainhero.app/' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: 'https://grainhero.app/' }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              '@id': 'https://grainhero.app/#organization',
              name: 'GrainHero',
              url: 'https://grainhero.app/',
              description:
                'GrainHero builds AI-powered grain storage monitoring with IoT sensors, spoilage prediction and real-time analytics.',
            },
            {
              '@type': 'WebSite',
              '@id': 'https://grainhero.app/#website',
              name: 'GrainHero',
              url: 'https://grainhero.app/',
              publisher: { '@id': 'https://grainhero.app/#organization' },
            },
            {
              '@type': 'SoftwareApplication',
              name: 'GrainHero',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              url: 'https://grainhero.app/',
              description:
                'Grain storage management platform with IoT sensor monitoring, AI spoilage prediction, alerts and predictive analytics for warehouses and silos.',
              provider: { '@id': 'https://grainhero.app/#organization' },
            },
          ],
        }),
      },
    ],
  }),
  component: NewHomePage,
})


function NewHomePage() {
  return (
    <main className="landing-type min-h-screen bg-[#FAFAF7] text-[#4A554C] landing-bg dark:text-foreground">
      <NewGlassNav />
      <section id="hero" aria-label="Hero section" className="landing-section">
        <AgriHero />
      </section>
      <section aria-label="The problem" className="landing-section">
        <ProblemMarquee />
      </section>
      <section aria-label="How it works" className="landing-section">
        <SimpleSteps />
      </section>
      <section aria-label="Hardware and sensors" className="landing-section">
        <HardwareSection />
      </section>
      <section aria-label="Brand film" className="landing-section">
        <AdShowcase />
      </section>
      <section aria-label="Statistics" className="landing-section">
        <StatsSection />
      </section>
      <section aria-label="Partners" className="landing-section">
        <PartnersStrip />
      </section>
      <HorizontalFAQ />
      <section aria-label="Call to action">
        <ContactCTA />
      </section>
      <NewFooter />
    </main>
  )
}
