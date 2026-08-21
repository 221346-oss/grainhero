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

const URL = "https://grainhero.app/solutions/silo-monitoring-system";
const TITLE = "Silo Monitoring System — Sensors, Gateways & Installation";
const DESC =
  "What a silo monitoring system is made of: probe cables, LoRa gateways, power options, offline buffering and how installation on an existing silo actually works.";

const faqs = [
  {
    q: "What is a silo monitoring system?",
    a: "A silo monitoring system is the hardware layer that measures conditions inside a storage structure and delivers them to software. It normally consists of suspended probe cables carrying temperature and humidity sensors at fixed depths, a controller at the silo, a radio gateway for the site, and a cloud service that stores and interprets the readings.",
  },
  {
    q: "How many sensors does one silo need?",
    a: "Coverage depends on diameter and height rather than a fixed count. The practical rule is one probe cable per 6-8 metres of diameter plus one at the centre, with sensor nodes every 1.5-2 metres of grain depth. A 12 metre flat-bottom bin typically ends up with three to five cables.",
  },
  {
    q: "Can it be retrofitted to an existing silo?",
    a: "Yes. Probe cables are suspended from roof anchors and no structural modification is required for most steel and concrete silos. Flat stores and warehouse piles use floor-anchored or wall-mounted probes instead.",
  },
  {
    q: "What connectivity does it use?",
    a: "Sensor-to-gateway links use LoRa, which reaches several kilometres line-of-sight and passes through farm infrastructure well. The gateway backhauls over Wi-Fi, Ethernet or cellular, whichever the site has. Readings are buffered locally when the backhaul drops and backfilled on reconnection.",
  },
  {
    q: "How is it powered?",
    a: "Controllers run on mains power where available, with a solar and battery option for remote structures. Sensor nodes draw from the probe cable rather than individual batteries, so there are no cells to replace inside the grain mass.",
  },
  {
    q: "Who installs it?",
    a: "GrainHero dispatches an assigned technician for the install. The order, the technician, the scheduled date and the per-silo sensor placement are all visible in your account, and the same record tracks the device afterwards.",
  },
];

export const Route = createFileRoute("/solutions/silo-monitoring-system")({
  head: () => ({
    meta: [
      { title: `${TITLE} | GrainHero` },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbLd([
            { label: "Home", url: "https://grainhero.app/" },
            { label: "Solutions", url: "https://grainhero.app/solutions/grain-storage-monitoring" },
            { label: "Silo monitoring system", url: URL },
          ]),
        ),
      },
      { type: "application/ld+json", children: JSON.stringify(faqLd(faqs)) },
    ],
  }),
  component: SiloMonitoringSystemPage,
});

function SiloMonitoringSystemPage() {
  return (
    <MarketingPage
      eyebrow="Solutions"
      title={
        <>
          A silo monitoring system, from probe cable to{" "}
          <span className="text-[#2FA84F]">dashboard</span>
        </>
      }
      intro="The hardware side of grain monitoring: what sits inside the silo, how many sensors a structure needs, how readings get out of a site with no reliable internet, and what installation day looks like."
      crumbs={[{ label: "Home", to: "/" }, { label: "Silo monitoring system" }]}
    >
      <Section heading="The four layers">
        <DataTable
          columns={["Layer", "Component", "Job"]}
          rows={[
            [
              "Sensing",
              "Probe cable with nodes at fixed depths",
              "Temperature and interstitial humidity through the full grain column",
            ],
            [
              "Edge",
              "Silo controller",
              "Polls the cables, timestamps readings, buffers them, drives aeration relays",
            ],
            [
              "Transport",
              "LoRa gateway",
              "Collects from every controller on site and backhauls over Wi-Fi, Ethernet or cellular",
            ],
            [
              "Platform",
              "GrainHero cloud",
              "History, thresholds, spoilage scoring, alerts and reports",
            ],
          ]}
        />
      </Section>

      <Section heading="Sensor placement">
        <p>
          Coverage, not sensor count, is what determines whether a hot spot is detected. Grain
          conducts heat poorly, so a pocket more than roughly a metre from the nearest node can
          develop without moving that node&apos;s reading much.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>One cable at the centre line, where fines concentrate and airflow is weakest.</li>
          <li>
            Additional cables on a ring at roughly two-thirds of the radius, one per 6-8 metres of
            diameter.
          </li>
          <li>Nodes every 1.5-2 metres of depth, with one node in the headspace.</li>
          <li>
            Extra attention near the fill point and the roof, the two zones most exposed to
            condensation and moisture migration.
          </li>
        </ul>
        <DataTable
          caption="Typical configurations. Final layout comes from the site survey."
          columns={["Structure", "Cables", "Nodes per cable"]}
          rows={[
            ["6 m bin", "1-2", "4-6"],
            ["12 m flat-bottom bin", "3-5", "8-12"],
            ["18 m concrete silo", "5-7", "12-16"],
            ["Flat store / warehouse pile", "Grid on 8-10 m spacing", "3-5"],
          ]}
        />
      </Section>

      <Section heading="Working without reliable internet">
        <p>
          Most storage sites are not well connected, so the system is designed to keep measuring
          regardless. Controllers hold readings in local storage and the gateway retries the
          backhaul continuously. When the link returns, buffered readings are uploaded with their
          original timestamps, so the trend line stays continuous rather than showing a gap. Local
          threshold rules keep working during the outage, including aeration control, so a hot spot
          is still acted on even when nothing can reach the cloud.
        </p>
      </Section>

      <Section heading="Installation and tracking">
        <p>
          Hardware is ordered through your account. Each order carries the structures it covers, and
          once scheduled it shows the assigned technician, the install date and the city and site.
          After commissioning, every device stays linked to the silo it was installed in, so the
          same record answers both &quot;where is my order&quot; and &quot;which sensor is reporting
          this reading&quot;. Managers see the full trail from their installation orders page.
        </p>
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
              note: "What is measured and how alerts are raised.",
            },
            {
              to: "/solutions/grain-management-software",
              label: "Grain management software",
              note: "The platform the hardware reports into.",
            },
            {
              to: "/guides/grain-storage",
              label: "Grain storage guide",
              note: "Safe moisture and temperature by grain type.",
            },
            {
              to: "/contact",
              label: "Request a site survey",
              note: "Get a layout for your structures.",
            },
          ]}
        />
      </Section>
    </MarketingPage>
  );
}
