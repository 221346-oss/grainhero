import { createFileRoute } from "@tanstack/react-router";
import {
  MarketingPage,
  Section,
  DataTable,
  FaqList,
  NextSteps,
  breadcrumbLd,
  faqLd,
} from "@/components/marketing/MarketingPage";

const URL = "https://grainhero.app/guides/grain-storage";
const TITLE = "Grain Storage Guide — Safe Moisture, Temperature & Aeration";
const DESC =
  "A practical grain storage guide: safe moisture and temperature by grain type, how spoilage starts, when to run aeration, insect and mould warning signs, and a storage checklist.";

const faqs = [
  {
    q: "What moisture is safe for storing wheat?",
    a: "Wheat is generally held at 12-13% moisture for long-term storage. Above roughly 14%, mould growth becomes likely once grain temperature rises above about 15°C, and safe storage life falls from months to weeks.",
  },
  {
    q: "What temperature should stored grain be kept at?",
    a: "Cooler is safer. Below about 15°C most storage insects stop reproducing effectively, and below about 10°C they become largely inactive. Cooling the mass with ambient air during cool nights is the cheapest control available.",
  },
  {
    q: "Why does grain heat up in storage?",
    a: "Grain is alive and respires, and so do the insects and fungi in it. Respiration releases heat, water and carbon dioxide. Because a grain mass insulates itself, that heat accumulates locally instead of escaping, which is why a hot spot grows rather than dissipating.",
  },
  {
    q: "What is moisture migration?",
    a: "When the outside of a silo cools and the core stays warm, convection currents carry moisture from the warm core to the cool surface, where it condenses. The result is a wet crust at the top of the grain, often the first place mould appears, even though the grain went in dry.",
  },
  {
    q: "When should aeration fans be run?",
    a: "Run them when the ambient air is cooler and no wetter in equilibrium terms than the grain — typically cool, dry nights. Running fans in warm humid conditions pushes moisture into the mass and makes things worse, which is why ambient sensing matters as much as grain sensing.",
  },
  {
    q: "What are the early signs of spoilage?",
    a: "A localised temperature rise with no matching rise nearby, a musty or sour smell at the exhaust, crusting or caking at the surface, condensation on the underside of the roof, and moths or beetles around the fill point.",
  },
];

export const Route = createFileRoute("/guides/grain-storage")({
  head: () => ({
    meta: [
      { title: `${TITLE} | GrainHero` },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESC,
          mainEntityOfPage: URL,
          author: { "@type": "Organization", name: "GrainHero" },
          publisher: { "@type": "Organization", name: "GrainHero" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbLd([
            { label: "Home", url: "https://grainhero.app/" },
            { label: "Guides", url: URL },
            { label: "Grain storage", url: URL },
          ]),
        ),
      },
      { type: "application/ld+json", children: JSON.stringify(faqLd(faqs)) },
    ],
  }),
  component: GrainStorageGuidePage,
});

function GrainStorageGuidePage() {
  return (
    <MarketingPage
      eyebrow="Guide"
      title={
        <>
          Grain storage: what actually keeps a{" "}
          <span className="text-[#2FA84F]">harvest sellable</span>
        </>
      }
      intro="Grain in a silo is not inert. It respires, it hosts insects and fungi, and it moves moisture around inside itself. This guide covers the three variables that decide whether it holds — moisture, temperature and time — and what to do when one of them drifts."
      crumbs={[{ label: "Home", to: "/" }, { label: "Grain storage guide" }]}
    >
      <Section heading="On this page">
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <a className="text-[#2FA84F] underline underline-offset-2" href="#moisture">
              Safe moisture by grain type
            </a>
          </li>
          <li>
            <a className="text-[#2FA84F] underline underline-offset-2" href="#temperature">
              Temperature and storage life
            </a>
          </li>
          <li>
            <a className="text-[#2FA84F] underline underline-offset-2" href="#failure">
              How storage fails
            </a>
          </li>
          <li>
            <a className="text-[#2FA84F] underline underline-offset-2" href="#aeration">
              Aeration: when to run fans
            </a>
          </li>
          <li>
            <a className="text-[#2FA84F] underline underline-offset-2" href="#checklist">
              Storage season checklist
            </a>
          </li>
        </ul>
      </Section>

      <Section id="moisture" heading="Safe moisture by grain type">
        <p>
          Moisture is the single biggest lever. Storage fungi need a relative humidity in the air
          between the kernels of roughly 65-70% to grow, and that interstitial humidity is set by
          the grain&apos;s own moisture content. Get the grain below its threshold and the fungi
          have nothing to work with, whatever the temperature.
        </p>
        <DataTable
          caption="Long-term storage targets in common use. Always confirm against local extension guidance and your buyer's contract."
          columns={["Grain", "Long-term (6+ months)", "Short-term (weeks)"]}
          rows={[
            ["Wheat", "12-13%", "up to 14%"],
            ["Paddy rice", "12-14%", "up to 15%"],
            ["Maize", "13-13.5%", "up to 15%"],
            ["Barley", "12-13%", "up to 14%"],
            ["Sorghum", "12-13%", "up to 14%"],
            ["Soybeans", "11-12%", "up to 13%"],
          ]}
        />
        <p>
          The relationship is not linear. Each additional point of moisture roughly halves safe
          storage life at a given temperature, which is why grain that seems fine at 15% in November
          can fail badly by March.
        </p>
      </Section>

      <Section id="temperature" heading="Temperature and storage life">
        <p>
          Temperature sets the speed of everything biological in the mass. The practical thresholds:
        </p>
        <DataTable
          columns={["Grain temperature", "What happens"]}
          rows={[
            ["Above 25°C", "Insects breed rapidly; mould grows quickly in any damp pocket"],
            ["15-25°C", "Insect activity continues; acceptable only for dry grain, short term"],
            ["10-15°C", "Insect reproduction largely stops; the usual working target"],
            ["Below 10°C", "Insects dormant, fungal growth very slow; safest long-term state"],
          ]}
        />
        <p>
          Cooling is cheaper than drying and works on the whole mass. Most operations should be
          driving grain temperature down with ambient air whenever conditions allow, rather than
          waiting for a problem.
        </p>
      </Section>

      <Section id="failure" heading="How storage fails">
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong className="text-[#111512]">Hot spots.</strong> A pocket of damp grain, fines or
            insects respires, warms, and drives more moisture into the surrounding grain — a
            self-accelerating loop that spreads outward.
          </li>
          <li>
            <strong className="text-[#111512]">Moisture migration.</strong> A warm core inside a
            cooling silo sets up convection that deposits moisture as condensation at the grain
            surface and the roof, crusting the top layer.
          </li>
          <li>
            <strong className="text-[#111512]">Fines accumulation.</strong> Broken kernels and chaff
            concentrate under the fill point, restricting airflow exactly where aeration is most
            needed. Coring the bin after filling removes most of it.
          </li>
          <li>
            <strong className="text-[#111512]">Insect infestation.</strong> Residual insects in an
            uncleaned bin colonise the new crop immediately. Cleaning between fills is not optional.
          </li>
          <li>
            <strong className="text-[#111512]">Mycotoxins.</strong> Once mould establishes, some
            species produce toxins that survive after the mould is gone, and the affected grain
            cannot be recovered by drying. This is why early detection, not remediation, is the
            goal.
          </li>
        </ul>
      </Section>

      <Section id="aeration" heading="Aeration: when to run fans">
        <p>
          Aeration is for moving temperature, not for drying wet grain. The decision rule is simple
          in principle: run the fans when the outside air will leave the grain cooler and no wetter
          than it is now.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>Cool, dry night air is almost always a good cooling opportunity.</li>
          <li>Warm, humid air adds moisture to the mass — leave the fans off.</li>
          <li>
            Run a full cooling cycle through the whole mass rather than stopping partway; a
            half-cooled bin has a temperature front sitting inside it, and fronts condense.
          </li>
          <li>Aim for cooling passes after harvest, in mid-autumn, and again in deep winter.</li>
        </ul>
        <p>
          Because the rule depends on both ambient and grain conditions at the same instant, it is a
          good candidate for automation — which is what{" "}
          <a
            className="font-medium text-[#2FA84F] underline underline-offset-2"
            href="/solutions/grain-storage-monitoring"
          >
            continuous monitoring
          </a>{" "}
          is used for.
        </p>
      </Section>

      <Section id="checklist" heading="Storage season checklist">
        <ol className="ml-5 list-decimal space-y-2">
          <li>
            Clean the structure and the handling equipment before filling; remove old residue.
          </li>
          <li>Dry incoming grain to its long-term target before it goes in, not after.</li>
          <li>
            Record intake moisture and grain type per batch, so thresholds are batch-specific.
          </li>
          <li>
            Core the bin after filling to pull the fines column out from under the fill point.
          </li>
          <li>Cool the mass to target with the first suitable ambient window.</li>
          <li>
            Monitor temperature and moisture at depth; investigate any point that diverges from its
            neighbours.
          </li>
          <li>Log every aeration run, treatment and inspection against the batch.</li>
          <li>
            Re-cool through the season and re-check the top layer for crusting after every cold
            snap.
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
              to: "/solutions/grain-storage-monitoring",
              label: "Grain storage monitoring",
              note: "Automate the checks in this guide.",
            },
            {
              to: "/solutions/silo-monitoring-system",
              label: "Silo monitoring hardware",
              note: "Probes, gateways and installation.",
            },
            {
              to: "/solutions/grain-management-software",
              label: "Grain management software",
              note: "Batch traceability and reporting.",
            },
            { to: "/contact", label: "Talk to us", note: "Ask about your specific storage setup." },
          ]}
        />
      </Section>
    </MarketingPage>
  );
}
