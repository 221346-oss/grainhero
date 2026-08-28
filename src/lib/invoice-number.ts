/**
 * Shared invoice-number generation, used by both the dispatch-sale quote
 * flow (dispatch-sales.functions.ts) and the marketplace-order flow
 * (invoicing.functions.ts) — both insert into the same buyer_invoices table.
 *
 * Previously each file had its own copy of a `COUNT(*)+1` generator, which
 * is not safe under concurrency (two requests can read the same count
 * before either insert commits, producing the same number) and drifts from
 * reality if any invoice row is ever deleted (count stops matching the
 * highest sequence actually issued) — either way `buyer_invoices_invoice_number_key`
 * gets violated. `nextInvoiceNumber` now derives the next value from the
 * highest existing sequence number for this admin+year instead of a row
 * count, and `insertInvoiceWithUniqueNumber` retries on an actual unique-
 * constraint violation (Postgres 23505) so a race that slips through
 * anyway still resolves instead of failing the whole request.
 */

type SB = any;

export async function nextInvoiceNumber(sb: SB, adminId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await sb
    .from("buyer_invoices")
    .select("invoice_number")
    .eq("admin_id", adminId)
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1);
  const last = (data?.[0]?.invoice_number as string | undefined) ?? "";
  const lastSeq = Number.parseInt(last.slice(prefix.length), 10);
  const nextSeq = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
  return `${prefix}${nextSeq.toString().padStart(5, "0")}`;
}

/**
 * Runs `insert(invoiceNumber)` with a freshly-generated number, retrying up
 * to `maxAttempts` times if the insert fails specifically on the
 * buyer_invoices invoice_number unique constraint (a concurrent request won
 * the same number first) — any other error is rethrown immediately.
 */
export async function insertInvoiceWithUniqueNumber<T>(
  sb: SB,
  adminId: string,
  insert: (
    invoiceNumber: string,
  ) => PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>,
  maxAttempts = 5,
): Promise<T> {
  let lastError: { code?: string; message?: string } | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const invoiceNumber = await nextInvoiceNumber(sb, adminId);
    const { data, error } = await insert(invoiceNumber);
    if (!error) return data as T;
    lastError = error;
    // 23505 = unique_violation. Only this specific case is worth retrying —
    // anything else (RLS, bad FK, validation) will just fail the same way
    // again, so surface it immediately instead of burning attempts.
    if (error.code !== "23505") throw error;
  }
  throw new Error(
    `Could not generate a unique invoice number after ${maxAttempts} attempts: ${lastError?.message ?? "unknown error"}`,
  );
}
