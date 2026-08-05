import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://grainhero.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          {
            path: "/solutions/grain-storage-monitoring",
            changefreq: "monthly",
            priority: "0.9",
          },
          {
            path: "/solutions/silo-monitoring-system",
            changefreq: "monthly",
            priority: "0.9",
          },
          {
            path: "/solutions/grain-management-software",
            changefreq: "monthly",
            priority: "0.9",
          },
          { path: "/guides/grain-storage", changefreq: "monthly", priority: "0.9" },
          { path: "/about", changefreq: "monthly", priority: "0.7" },
          { path: "/team", changefreq: "monthly", priority: "0.6" },
          { path: "/contact", changefreq: "monthly", priority: "0.7" },
          { path: "/blog", changefreq: "weekly", priority: "0.7" },
          { path: "/docs", changefreq: "monthly", priority: "0.6" },
          { path: "/help", changefreq: "monthly", priority: "0.6" },
          { path: "/marketplace", changefreq: "daily", priority: "0.8" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/cookies", changefreq: "yearly", priority: "0.3" },
        ];

        const urls = entries.map((entry) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${entry.path}</loc>`,
            entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
            entry.changefreq
              ? `    <changefreq>${entry.changefreq}</changefreq>`
              : null,
            entry.priority
              ? `    <priority>${entry.priority}</priority>`
              : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
