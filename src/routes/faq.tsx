import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  MarketingPage,
  Section,
  FaqList,
  NextSteps,
  breadcrumbLd,
  faqLd,
  faqSlug,
} from '@/components/marketing/MarketingPage'

const URL = 'https://grainhero.app/faq'
const TITLE = 'Frequently Asked Questions — GrainHero'
const DESC =
  'Answers to the questions storage operators actually ask: rising moisture, why a batch spoiled, sensor health, which silo needs attention, and what spoilage costs.'

/**
 * Operational questions — these mirror the marquee on the landing page, which
 * links straight to the matching answer here.
 */
const operations = [
  {
    q: 'Is moisture rising in silo 3?',
    a: 'Each silo carries probes at several depths, so moisture is tracked layer by layer instead of as one average for the structure. The silo view shows the current reading beside its recent trend, and a sustained rise raises an alert rather than waiting for a fixed threshold to be crossed.',
  },
  {
    q: 'Why did that batch spoil?',
    a: 'Every batch keeps its condition history from intake through to dispatch — temperature, humidity, moisture and CO₂. When something goes wrong you can go back to the window where the readings drifted and see what was recorded at the time, which alerts fired, and who acted on them.',
  },
  {
    q: 'Can we predict spoilage?',
    a: 'Yes. GrainHero flags the pattern that comes before spoilage, typically 24 to 48 hours early. It reads how the measurements move together over time rather than reacting to any single value crossing a line, which is what gives you the window to act.',
  },
  {
    q: 'Are the sensors online?',
    a: 'Sensor and controller health is reported continuously, so a unit that stops sending is surfaced rather than silently missing. If connectivity drops, the controller keeps logging locally for up to 7 days and backfills the gap once it reconnects.',
  },
  {
    q: 'Which silo needs attention?',
    a: 'The dashboard orders silos by risk rather than by name, so whatever needs a decision today sits at the top. Each entry shows what put it there — the reading that moved, how long it has been moving, and the batch affected.',
  },
  {
    q: 'How much did we lose?',
    a: 'Spoilage is tracked against each batch and its grade, so loss is expressed in tonnes and in value rather than as an incident count. Totals roll up by silo and by period, which also shows what acting earlier would have been worth.',
  },
]

/** Product and commercial questions — the set shown on the landing page. */
const product = [
  {
    q: 'How does the AI predict spoilage?',
    a: 'It flags the pattern that comes before spoilage, 24–48 hours early.',
  },
  {
    q: 'Do I need new silos?',
    a: 'No. The kit retro-fits onto silos you already own.',
  },
  {
    q: 'What if the internet drops?',
    a: 'The controller buffers 7 days locally and syncs on reconnect.',
  },
  {
    q: 'Can my whole team use it?',
    a: 'Yes — each role gets its own view and alerts.',
  },
  {
    q: 'What does it cost to start?',
    a: 'Start with hardware. The dashboard is included.',
  },
]

const allFaqs = [...operations, ...product]

const ldCrumbs = [
  { label: 'Home', url: 'https://grainhero.app/' },
  { label: 'FAQ', url: URL },
]

export const Route = createFileRoute('/faq')({
  // ?q=<slug> opens a single answer — used by the landing-page marquee.
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: URL },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: URL }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(breadcrumbLd(ldCrumbs)),
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify(faqLd(allFaqs)),
      },
    ],
  }),
  component: FaqPage,
})

function FaqPage() {
  const { q } = Route.useSearch()

  // Bring the targeted answer into view once it has rendered open.
  useEffect(() => {
    if (!q) return
    const el = document.getElementById(q)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [q])

  return (
    <MarketingPage
      eyebrow="FAQ"
      title="Everything worth asking."
      intro="The questions operators ask on the yard, and the ones asked before buying. If yours isn't here, contact us and we'll answer it directly."
      crumbs={[{ label: 'Home', to: '/' }, { label: 'FAQ' }]}
    >
      <Section heading="On the yard" id="operations">
        <FaqList items={operations} openSlug={q} />
      </Section>

      <Section heading="Product and pricing" id="product">
        <FaqList items={product} openSlug={q} />
      </Section>

      <Section heading="Next steps">
        <NextSteps
          links={[
            {
              to: '/contact',
              label: 'Talk to us',
              note: 'Ask anything this page did not cover.',
            },
            {
              to: '/solutions/silo-monitoring-system',
              label: 'How the hardware works',
              note: 'Probes, gateways, power and installation.',
            },
          ]}
        />
      </Section>
    </MarketingPage>
  )
}

export { faqSlug }
