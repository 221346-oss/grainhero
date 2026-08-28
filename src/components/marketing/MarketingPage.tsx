import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { NewGlassNav } from "@/components/landing/NewGlassNav";
import { NewFooter } from "@/components/landing/NewFooter";
import { LocalizedContent, translateText, useI18n } from "@/i18n";

export interface Crumb {
  label: string;
  to?: string;
}

interface MarketingPageProps {
  eyebrow?: string;
  title: ReactNode;
  intro: string;
  crumbs: Crumb[];
  children: ReactNode;
}

/**
 * Shared shell for long-form marketing / SEO pages.
 * Keeps the bone + field-green landing theme: dark hero, bone body, dark footer.
 */
export function MarketingPage({ eyebrow, title, intro, crumbs, children }: MarketingPageProps) {
  const { locale } = useI18n();
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <NewGlassNav />

      <header className="relative overflow-hidden bg-[#111512] px-4 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, rgba(47,168,79,0.5) 1px, transparent 0)",
            backgroundSize: "38px 38px",
          }}
        />
        <div className="relative z-10 mx-auto max-w-4xl">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-[#FAFAF7]/60">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-1">
                  {c.to ? (
                    <Link to={c.to} className="transition-colors hover:text-[#2FA84F]">
                      {translateText(c.label, locale)}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-[#FAFAF7]/90">
                      {translateText(c.label, locale)}
                    </span>
                  )}
                  {i < crumbs.length - 1 && <ChevronRight className="h-3 w-3 shrink-0" />}
                </li>
              ))}
            </ol>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {eyebrow && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#2FA84F]">
                {translateText(eyebrow, locale)}
              </p>
            )}
            <h1 className="text-[1.9rem] font-black leading-[1.08] tracking-tight text-[#FAFAF7] sm:text-5xl">
              <LocalizedContent>{title}</LocalizedContent>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#FAFAF7]/75 sm:text-lg">
              {translateText(intro, locale)}
            </p>
          </motion.div>
        </div>
      </header>

      <main className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl"><LocalizedContent>{children}</LocalizedContent></div>
      </main>

      <NewFooter />
    </div>
  );
}

export function Section({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: string;
  children: ReactNode;
}) {
  const { locale } = useI18n();
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mb-14 scroll-mt-28 last:mb-0"
    >
      <h2 className="mb-4 text-xl font-black tracking-tight text-[#111512] sm:text-2xl">
        {translateText(heading, locale)}
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-[#111512]/75"><LocalizedContent>{children}</LocalizedContent></div>
    </motion.section>
  );
}

export function DataTable({
  caption,
  columns,
  rows,
}: {
  caption?: string;
  columns: string[];
  rows: string[][];
}) {
  const { locale } = useI18n();
  return (
    <div className="overflow-x-auto rounded-xl border border-[#111512]/10">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          {caption && (
          <caption className="px-4 pt-4 text-left text-xs text-[#111512]/50">{translateText(caption, locale)}</caption>
        )}
        <thead>
          <tr className="border-b border-[#111512]/10 bg-[#111512]/[0.03]">
            {columns.map((c) => (
              <th key={c} scope="col" className="px-4 py-3 font-semibold text-[#111512]">
                {translateText(c, locale)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-b border-[#111512]/[0.07] last:border-0">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={
                    i === 0 ? "px-4 py-3 font-medium text-[#111512]" : "px-4 py-3 text-[#111512]/70"
                  }
                >
                  {translateText(cell, locale)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const { locale } = useI18n();
  return (
    <div className="divide-y divide-[#111512]/10 border-y border-[#111512]/10">
      {items.map((item) => (
        <details key={item.q} className="group py-4">
          <summary className="cursor-pointer list-none text-[15px] font-semibold text-[#111512] marker:hidden">
            <span className="flex items-start justify-between gap-4">
              {translateText(item.q, locale)}
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#2FA84F] transition-transform group-open:rotate-90" />
            </span>
          </summary>
          <p className="mt-3 text-[15px] leading-relaxed text-[#111512]/70">{translateText(item.a, locale)}</p>
        </details>
      ))}
    </div>
  );
}

export function NextSteps({ links }: { links: { to: string; label: string; note: string }[] }) {
  const { locale } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="group rounded-xl border border-[#111512]/10 p-4 transition-colors hover:border-[#2FA84F] hover:bg-[#2FA84F]/[0.04]"
        >
          <span className="flex items-center gap-1 text-[15px] font-semibold text-[#111512]">
            {translateText(l.label, locale)}
            <ChevronRight className="h-4 w-4 text-[#2FA84F] transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="mt-1 block text-sm text-[#111512]/60">{translateText(l.note, locale)}</span>
        </Link>
      ))}
    </div>
  );
}

export function breadcrumbLd(crumbs: { label: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: c.url,
    })),
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}
