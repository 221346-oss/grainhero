# SEO growth plan for grainhero.app

## What the Semrush data says

grainhero.app has no organic data yet — the domain is new to Google's index, so
every ranking has to be earned from scratch. The good news: this niche is wide open.

| Keyword                      | Volume/mo | Difficulty    |
| ---------------------------- | --------- | ------------- |
| grain silo                   | 5,400     | 28 — easy     |
| grain storage                | 880       | 25 — easy     |
| rice storage                 | 720       | 25 — easy     |
| grain management software    | 110       | 8 — very easy |
| grain bin monitoring         | 70        | 0 — very easy |
| grain inventory management   | 70        | 2 — very easy |
| grain moisture sensor        | 30        | 8 — very easy |
| grain storage monitoring     | 20        | 0 — very easy |
| smart silo                   | 20        | 0 — very easy |
| post harvest loss prevention | 20        | 0 — very easy |

Source: Semrush (US database). Volumes are small but the difficulty scores are
near zero — a new site can realistically reach page 1 on the software and
monitoring terms. The head terms ("grain silo", "grain storage") are informational,
so they are won with a genuinely useful guide, not a product page.

The SERP for "grain management software" is held by grain accounting and
inventory vendors (agvance.net, gmsgrain.com, agvisionsoftware.com). None of them
lead with IoT sensing + AI spoilage prediction — that is GrainHero's angle.

## The problem right now

The site is a single marketing page plus thin utility pages. There is no page
that actually targets any of these searches, and `/blog` lists six posts that do
not exist as pages (dead cards, fabricated case study). Google has nothing to rank.

## What to build

**1. Three solution pages** — one per keyword cluster, each a real page with
substance, internal links and its own metadata + schema:

- `/solutions/grain-storage-monitoring` — the pillar. What continuous monitoring
  is, the sensor stack, thresholds by grain type, what an alert looks like.
  Targets: grain storage monitoring, grain temperature monitoring, smart silo.
- `/solutions/silo-monitoring-system` — hardware-led. Probe layout, LoRa/Wi-Fi
  coverage, install process, spec table. Targets: silo monitoring system, grain
  bin monitoring, grain moisture sensor.
- `/solutions/grain-management-software` — platform-led. Batches, warehouses,
  inventory, dispatch, roles, reports. Targets: grain management software, grain
  inventory management, grain quality management.

**2. One real guide** at `/guides/grain-storage` covering safe moisture and
temperature ranges for wheat, rice, maize, barley and sorghum, aeration timing
and spoilage warning signs. This is the page that can reach the 880/mo and
5,400/mo informational terms, and it links down into the solution pages.

**3. Fix `/blog`** — replace the six dead cards with links to the four real pages
above, and drop the invented "Johnson Farms 35%" case study (unverifiable claims
hurt both trust and search quality ratings).

**4. Wire it together** — a Solutions dropdown in the top nav, footer links,
homepage links into the pillar, breadcrumbs on each new page, sitemap entries,
and `llms.txt` updated.

## Technical details

- New routes: `src/routes/solutions.grain-storage-monitoring.tsx`,
  `solutions.silo-monitoring-system.tsx`, `solutions.grain-management-software.tsx`,
  `guides.grain-storage.tsx`, plus a shared `MarketingPage` layout component so
  all four share the nav/footer/section rhythm and the existing bone + field-green
  theme with no new visual language.
- Each route's `head()` carries a unique title/description, self-referencing
  canonical, og/twitter tags, and JSON-LD: `BreadcrumbList` on all four,
  `FAQPage` on the pages that end in an FAQ block, `Article` on the guide.
- Single `<h1>` per page, H2/H3 hierarchy matching the search intent, real tables
  (moisture/temperature ranges, hardware specs) rather than prose blocks.
- Numbers used on the pages come from published post-harvest research and are
  cited inline — no invented customer results or percentages.
- `src/routes/sitemap[.]xml.ts` and `public/llms.txt` extended with the new URLs.
- No changes to app logic, auth, or any `_authenticated` route.

## What this does not do

Rankings take weeks to months on a new domain. This plan makes the site
rankable and gives Google something worth indexing; connecting Google Search
Console afterwards is what makes the progress measurable.
