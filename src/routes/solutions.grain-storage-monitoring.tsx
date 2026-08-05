import { createFileRoute } from '@tanstack/react-router'
import {
  MarketingPage,
  Section,
  DataTable,
  FaqList,
  NextSteps,
  breadcrumbLd,
  faqLd,
} from '@/components/marketing/MarketingPage'

const URL = 'https://grainhero.app/solutions/grain-storage-monitoring'
const TITLE = 'Grain Storage Monitoring — Continuous Temperature & Moisture Watch'
const DESC =
  'How continuous grain storage monitoring works: in-mass temperature and moisture sensing, safe thresholds by grain type, alert escalation and AI spoilage prediction.'

const faqs = [
  {
    q: 'What is grain storage monitoring?',
    a: 'Grain storage monitoring is the continuous measurement of temperature, moisture and humidity inside a stored grain mass, combined with a rule set that raises an alert when readings drift outside the safe range for that grain. Manual probing samples one point at one moment; continuous monitoring samples every depth on a fixed interval, which is what makes an early-stage hot spot visible.',
  },
  {
    q: 'How often should stored grain be checked?',
    a: 'Standard extension guidance is to inspect stored grain at least every two weeks in cool weather and weekly in warm weather. Sensor-based monitoring replaces that inspection interval with automatic readings, typically every 15 to 60 minutes, so the interval stops being the limiting factor.',
  },
  {
    q: 'What temperature rise indicates a problem?',
    a: 'A sustained rise at one probe point while neighbouring points stay flat is the classic hot-spot signature. A rise of roughly 2-5 degrees Celsius above the surrounding grain mass over a few days warrants investigation, because grain does not warm itself without biological activity — insects, mould or respiring high-moisture grain.',
  },
  {
    q: 'Does monitoring work without internet at the site?',
    a: 'Yes. GrainHero controllers buffer readings locally and forward them over LoRa to a gateway, then to the cloud when a connection is available. Readings taken during an outage are backfilled once the link returns, so the history has no gaps.',
  },
  {
    q: 'Can monitoring control aeration fans automatically?',
    a: 'Yes. Actuator control is rule-driven: fans can be triggered when ambient conditions are favourable for cooling or drying and blocked when running them would add moisture to the mass. Every automatic action is logged with the readings that triggered it.',
  },
]

export const Route = createFileRoute('/solutions/grain-storage-monitoring')({
  head: () => ({
    meta: [
      { title: `${TITLE} | GrainHero` },
      { name: 'description', content: DESC },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESC },
      { property: 'og:url', content: URL },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: URL }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(
          breadcrumbLd([
            { label: 'Home', url: 'https://grainhero.app/' },
            { label: 'Solutions', url: 'https://grainhero.app/solutions/grain-storage-monitoring' },
            { label: 'Grain storage monitoring', url: URL },
          ]),
        ),
      },
      { type: 'application/ld+json', children: JSON.stringify(faqLd(faqs)) },
    ],
  }),
  component: GrainStorageMonitoringPage,
})

function GrainStorageMonitoringPage() {
  return (
    <MarketingPage
      eyebrow="Solutions"
      title={
        <>
          Grain storage monitoring that catches spoilage{' '}
          <span className="text-[#2FA84F]">before it spreads</span>
        </>
      }
      intro="Stored grain fails from the inside out. Continuous temperature and moisture sensing at multiple depths turns an invisible problem into a dated, measurable trend you can act on while the loss is still small."
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Grain storage monitoring' },
      ]}
    >
      <Section heading="Why manual checks miss the early stage">
        <p>
          Spoilage starts as a localised pocket. Respiring grain, insects and mould all release
          heat and moisture, and because a grain mass is an excellent insulator, that heat stays
          concentrated instead of dissipating. By the time a hot spot is warm enough to notice
          from the surface or from a single probe sample, the affected volume has usually grown
          well past the point where aeration alone will fix it.
        </p>
        <p>
          Post-harvest losses in developing regions are commonly estimated at{' '}
          <a
            className="font-medium text-[#2FA84F] underline underline-offset-2"
            href="https://www.fao.org/platform-food-loss-waste/en"
            target="_blank"
            rel="noopener noreferrer"
          >
            10-20% of cereal production
          </a>{' '}
          by the FAO, with storage a significant share of that. The measurable part of the
          problem — temperature and moisture drift — is exactly what a sensor network is good at.
        </p>
      </Section>

      <Section heading="What gets measured, and where">
        <p>
          A single reading at the top of a silo tells you about the headspace, not the grain. The
          useful signal comes from readings distributed through the mass.
        </p>
        <DataTable
          columns={['Measurement', 'Where it is taken', 'What it tells you']}
          rows={[
            [
              'Grain temperature',
              'Multiple depths on each probe cable',
              'Hot-spot formation, insect activity, effectiveness of a cooling run',
            ],
            [
              'Interstitial humidity',
              'Same depths as temperature',
              'Equilibrium moisture of the grain at that point — the leading indicator of mould risk',
            ],
            [
              'Headspace temp / humidity',
              'Above the grain surface',
              'Condensation risk on the roof and upper layer',
            ],
            [
              'Ambient conditions',
              'Outside the structure',
              'Whether running aeration now would cool the grain or wet it',
            ],
            [
              'CO₂ (optional)',
              'Headspace or exhaust',
              'Rising respiration across the whole mass, often ahead of a temperature rise',
            ],
          ]}
        />
      </Section>

      <Section heading="Safe ranges are grain-specific">
        <p>
          There is no single safe number. Each grain has its own moisture ceiling for long-term
          storage, and every point of moisture above that ceiling shortens safe storage life
          sharply at warm temperatures.
        </p>
        <DataTable
          caption="Widely used long-term storage targets. Confirm against your local extension guidance and buyer contract."
          columns={['Grain', 'Target moisture', 'Target grain temp']}
          rows={[
            ['Wheat', '12-13%', 'Below 15°C'],
            ['Paddy rice', '12-14%', 'Below 15°C'],
            ['Maize', '13-13.5%', 'Below 15°C'],
            ['Barley', '12-13%', 'Below 15°C'],
            ['Sorghum', '12-13%', 'Below 15°C'],
          ]}
        />
        <p>
          The full breakdown, including aeration timing and the warning signs to look for, is in
          the <a className="font-medium text-[#2FA84F] underline underline-offset-2" href="/guides/grain-storage">grain storage guide</a>.
        </p>
      </Section>

      <Section heading="From reading to action">
        <p>Readings on their own are just a chart. The value is in what happens next:</p>
        <ol className="ml-5 list-decimal space-y-2">
          <li>
            <strong className="text-[#111512]">Baseline.</strong> Each batch gets its grain type,
            intake moisture and target thresholds recorded at fill.
          </li>
          <li>
            <strong className="text-[#111512]">Trend detection.</strong> A point warming faster
            than its neighbours is flagged, not just a point crossing an absolute limit — drift
            matters more than a single number.
          </li>
          <li>
            <strong className="text-[#111512]">Prediction.</strong> A model trained on storage
            histories scores each batch for spoilage risk so attention goes to the batch most
            likely to fail next, not the one that already failed.
          </li>
          <li>
            <strong className="text-[#111512]">Alert and escalate.</strong> The technician on duty
            is notified first; unacknowledged alerts escalate to the warehouse manager.
          </li>
          <li>
            <strong className="text-[#111512]">Act and record.</strong> Aeration runs, turning and
            inspections are logged against the batch, so the fix is auditable at sale time.
          </li>
        </ol>
      </Section>

      <Section heading="Frequently asked questions">
        <FaqList items={faqs} />
      </Section>

      <Section heading="Keep reading">
        <NextSteps
          links={[
            {
              to: '/solutions/silo-monitoring-system',
              label: 'Silo monitoring hardware',
              note: 'Probe layout, connectivity and installation.',
            },
            {
              to: '/solutions/grain-management-software',
              label: 'Grain management software',
              note: 'Batches, inventory, dispatch and reporting.',
            },
            {
              to: '/guides/grain-storage',
              label: 'Grain storage guide',
              note: 'Safe moisture and temperature by grain type.',
            },
            {
              to: '/contact',
              label: 'Talk to us',
              note: 'Discuss a site survey for your facility.',
            },
          ]}
        />
      </Section>
    </MarketingPage>
  )
}