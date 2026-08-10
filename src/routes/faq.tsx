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
    a: 'Moisture is recorded on every reading for that silo, alongside temperature, humidity, CO₂ and VOC. Each silo sets its own thresholds per metric — a normal band, a separate critical band, and a time window a reading has to stay outside the band before it counts, so a momentary spike does not trigger anything. A hysteresis margin stops a value sitting on the line from firing over and over. Cross the band for the full window and the silo raises a prioritised alert.',
  },
  {
    q: 'Why did that batch spoil?',
    a: 'Every state change on a batch is written to its event log with the state it moved from, the state it moved to, who made the change, an optional note and a snapshot of the batch at that moment. The batch itself carries its quality tests, its grade and any spoilage events recorded against it. Alerts raised on it keep who they were assigned to, who acknowledged them and what action was taken — so you can reconstruct both the conditions and the response, not just the outcome.',
  },
  {
    q: 'Can we predict spoilage?',
    a: 'Yes. Each prediction takes grain type, temperature, humidity, moisture, CO₂ and VOC together with how long the batch has been in storage, and where available the recent history of those readings rather than only the latest value. It returns a risk class — low, moderate, high or critical — a score from 0 to 100, a confidence figure, and the factors behind the result. Predictions are stored against the silo and the batch, so you can see how risk moved over time instead of only where it stands now.',
  },
  {
    q: 'Are the sensors online?',
    a: 'Devices send a heartbeat on their own schedule and are counted as offline when one is missed. The triage view flags anything with no heartbeat in the last 15 minutes; the platform monitoring view allows three times the device’s own expected interval before calling it offline. Each device record also tracks battery level, firmware version and when calibration is next due, so a unit that is still reporting but degrading is visible too. The offline count sits on the attention queue next to any failed actuator commands.',
  },
  {
    q: 'Which silo needs attention?',
    a: 'The attention queue scores every silo rather than listing them alphabetically. Unresolved alerts from the last 24 hours are weighted by severity — critical counts 100, warning 30, info 5 — and a near-full silo adds to that, 20 points at 95% of capacity and 8 at 85%. Silos scoring zero drop out entirely and the rest sort highest first. Each row shows its fill percentage, how many alerts are open, how many of those are critical, and the specific alert driving the score.',
  },
  {
    q: 'How much did we lose?',
    a: 'Each batch carries its own economics — quantity, purchase price per kg, sale price per kg, and the resulting revenue and profit — together with its grade and any spoilage label applied to it. Analytics totals revenue and profit across batches and dispatches, so what a spoiled batch cost is visible against what comparable batches returned over the same period.',
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
