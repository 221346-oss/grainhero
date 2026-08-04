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
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: NewHomePage,
})


function NewHomePage() {
  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#4A554C] landing-bg dark:text-foreground">
      <NewGlassNav />
      <section id="hero" aria-label="Hero section">
        <AgriHero />
      </section>
      <section id="problem" aria-label="The problem">
        <ProblemMarquee />
      </section>
      <section id="how-it-works" aria-label="How it works">
        <SimpleSteps />
      </section>
      <section id="hardware" aria-label="Hardware and 3D silo">
        <HardwareSection />
      </section>
      <section aria-label="Brand film">
        <AdShowcase />
      </section>
      <section aria-label="Statistics">
        <StatsSection />
      </section>
      <section aria-label="Partners">
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
