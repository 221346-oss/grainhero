import { Badge } from "@/components/ui/badge";
const map: Record<string, string> = {
  queued: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  sent: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  ack: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  failed: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  expired: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};
export function CommandStatusBadge({ status }: { status: string }) {
  return <Badge className={`${map[status] ?? map.queued} border-0 capitalize`}>{status}</Badge>;
}
