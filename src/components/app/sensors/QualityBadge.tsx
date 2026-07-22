import { Badge } from "@/components/ui/badge";
const map: Record<string, string> = {
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  stale: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  out_of_range: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  missing: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};
export function QualityBadge({ flag }: { flag: string | null | undefined }) {
  const f = flag ?? "ok";
  return <Badge className={`${map[f] ?? map.ok} border-0`}>{f}</Badge>;
}
