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

const URL = "https://grainhero.app/solutions/grain-management-software";
const TITLE = "Grain Management Software — Batches, Inventory & Reporting";
const DESC =
  "Grain management software built around live sensor data: batch traceability, silo inventory, role-based access for managers and technicians, alerts and export-ready reports.";

const faqs = [
  {
    q: "What does grain management software do?",
    a: "It is the record of what grain you hold, where it is, what condition it is in and what has happened to it. That covers intake and grading, batch-to-silo assignment, live storage conditions, aeration and treatment history, dispatch, and the reports built from all of it.",
  },
  {
    q: "How is this different from grain accounting software?",
    a: "Most grain software in the market is accounting-first: contracts, settlements and tickets. GrainHero is condition-first. It assumes sensors are attached to the storage and treats spoilage risk as the primary thing being managed, with inventory and dispatch built on top of that.",
  },
  {
    q: "Does it work for multiple warehouses?",
    a: "Yes. Each organisation can hold many sites, each with its own silos, staff and stock. Access is role-based: an owner sees everything, a warehouse manager sees their site, and a technician sees the work assigned to them.",
  },
  {
    q: "Can I use the software without GrainHero hardware?",
    a: "You can run inventory, batches and dispatch with manually entered readings. The spoilage prediction and automatic alerting need a continuous reading stream, so they only become useful once sensors are installed.",
  },
  {
    q: "Can reports be exported?",
    a: "Yes. Condition history, inventory positions and financial summaries can be downloaded for audits, insurance and buyer documentation.",
  },
];

export const Route = createFileRoute("/solutions/grain-management-software")({
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
            { label: "Grain management software", url: URL },
          ]),
        ),
      },
      { type: "application/ld+json", children: JSON.stringify(faqLd(faqs)) },
    ],
  }),
  component: GrainManagementSoftwarePage,
});

function GrainManagementSoftwarePage() {
  return (
    <MarketingPage
      eyebrow="Solutions"
      title={
        <>
          Grain management software that starts with{" "}
          <span className="text-[#2FA84F]">condition</span>, not paperwork
        </>
      }
      intro="Inventory tells you how much grain you have. It does not tell you how much of it will still be sellable next month. GrainHero ties every batch to its live storage conditions, so quantity and quality live in the same record."
      crumbs={[{ label: "Home", to: "/" }, { label: "Grain management software" }]}
    >
      <Section heading="What the platform covers">
        <DataTable
          columns={["Area", "What you do there"]}
          rows={[
            [
              "Intake & batches",
              "Record supplier, grain type, intake moisture and grade; assign the batch to a silo",
            ],
            [
              "Silos & inventory",
              "Live fill level, current conditions and batch composition for every structure",
            ],
            [
              "Conditions & alerts",
              "Temperature and moisture history per depth, threshold breaches, escalation to the right person",
            ],
            [
              "AI insights",
              "Spoilage risk scoring per batch so attention goes to the batch most likely to fail next",
            ],
            [
              "Operations",
              "Aeration runs, treatments, inspections and turning, logged against the batch",
            ],
            [
              "Dispatch & sales",
              "Outbound loads drawn from batches, with the condition history attached",
            ],
            [
              "Reports",
              "Condition audit trails, inventory positions and financial summaries, exportable",
            ],
          ]}
        />
      </Section>

      <Section heading="Built around roles, not one giant screen">
        <p>
          A technician and an owner need different things on screen, and giving both the same
          dashboard means neither gets a usable one.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong className="text-[#111512]">Owner / admin</strong> — every site, subscription and
            financial position; where capacity and revenue are going.
          </li>
          <li>
            <strong className="text-[#111512]">Warehouse manager</strong> — their site&apos;s silos,
            batches, open alerts, staff and installation orders.
          </li>
          <li>
            <strong className="text-[#111512]">Technician</strong> — the assigned tasks, the silo in
            question, and the reading history needed to act on it.
          </li>
        </ul>
        <p>
          Access is enforced at the data layer, so a user cannot read another organisation&apos;s
          records even by changing a URL.
        </p>
      </Section>

      <Section heading="Traceability that survives an audit">
        <p>
          Every batch carries a dated history: when it arrived, at what moisture, which silo it went
          into, every condition reading while it was stored, every aeration run and treatment
          applied, and which outbound load it left on. When a buyer or insurer asks how the grain
          was held, that record is the answer, and it can be exported rather than reconstructed from
          memory.
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
              note: "The sensing layer the software runs on.",
            },
            {
              to: "/solutions/silo-monitoring-system",
              label: "Silo monitoring hardware",
              note: "Probes, gateways and installation.",
            },
            {
              to: "/guides/grain-storage",
              label: "Grain storage guide",
              note: "Safe moisture and temperature by grain type.",
            },
            {
              to: "/contact",
              label: "Talk to us",
              note: "See the platform against your operation.",
            },
          ]}
        />
      </Section>
    </MarketingPage>
  );
}
