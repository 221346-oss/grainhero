/**
 * Reporting windows — the periods every "how are we doing" figure is measured
 * over, and the period immediately before it that the deltas compare against.
 *
 * Lives on its own, free of server-function imports, so both the scoped
 * dashboard and the account-wide summary measure the same months and can be
 * tested without a Supabase client. Two screens reporting "this month" over
 * different months is the kind of disagreement nobody thinks to check for.
 */
export type Range = "today" | "7d" | "30d" | "mtd" | "ytd";

export function rangeToWindow(range: Range) {
  const now = new Date();
  let start = new Date(now);
  let priorStart = new Date(now);
  switch (range) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      priorStart = new Date(start.getTime() - 24 * 3600 * 1000);
      break;
    case "7d":
      start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      priorStart = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
      break;
    case "30d":
      start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      priorStart = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
      break;
    case "mtd":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      priorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case "ytd":
      start = new Date(now.getFullYear(), 0, 1);
      priorStart = new Date(now.getFullYear() - 1, 0, 1);
      break;
  }
  return {
    startISO: start.toISOString(),
    priorStartISO: priorStart.toISOString(),
    priorEndISO: start.toISOString(),
  };
}
