/**
 * OCR abstraction for extracting payment details from an uploaded receipt
 * screenshot. This is the ONLY module that should know about the underlying
 * OCR engine — currently Tesseract.js (free, client-side). Every caller goes
 * through `extractPaymentDetails()` and only ever sees `ExtractedPaymentDetails`.
 *
 * Swapping to a paid OCR API later (Google Vision, AWS Textract) means
 * rewriting the internals of this file only — no UI or calling code changes,
 * since the public function signature and return shape stay the same.
 */

export interface ExtractedPaymentDetails {
  paymentId: string | null;
  amount: number | null;
  date: string | null;
  rawText: string;
  confidence: number;
}

// A currency symbol/code on either side of the number — optional, but when
// present right next to a total-ish label it's the strongest possible
// signal that this specific number is the total, not an incidental digit
// elsewhere on the receipt (a date, a P.O. number, a line-item quantity).
const CUR = "(?:\\$|rs\\.?|pkr|₨)";
const NUM = "([\\d,]+(?:\\.\\d{1,2})?)";

// Ordered most- to least-specific label — "grand total" / "total due" beat
// a bare "total" when both are present (e.g. a subtotal + total receipt).
// \b around the label words matters: it's what keeps "total" from matching
// inside "Subtotal".
const TOTAL_LABEL_PATTERNS = [
  new RegExp(`grand\\s*total\\s*[:\\-]?\\s*${CUR}?\\s*${NUM}\\s*${CUR}?`, "i"),
  new RegExp(`total\\s*due\\s*[:\\-]?\\s*${CUR}?\\s*${NUM}\\s*${CUR}?`, "i"),
  new RegExp(`amount\\s*due\\s*[:\\-]?\\s*${CUR}?\\s*${NUM}\\s*${CUR}?`, "i"),
  new RegExp(`\\btotal\\b\\s*[:\\-]?\\s*${CUR}?\\s*${NUM}\\s*${CUR}?`, "i"),
  new RegExp(`\\bamount\\b\\s*[:\\-]?\\s*${CUR}?\\s*${NUM}\\s*${CUR}?`, "i"),
  new RegExp(`\\bpaid\\b\\s*[:\\-]?\\s*${CUR}?\\s*${NUM}\\s*${CUR}?`, "i"),
];

function parseAmount(text: string): number | null {
  for (const re of TOTAL_LABEL_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  // No total/amount-labeled number found. Previously this fell back to
  // "largest number anywhere in the text" — on a real receipt that picked
  // up a garbled date+PO-number concatenation (1,022,010) over the actual
  // "TOTAL $154.06" a few characters later, because the label patterns
  // above didn't tolerate the $ between the label and the digits. A wrong
  // auto-filled amount is worse than none: the wizard's manual-entry
  // fallback (ocrFailed state in DispatchSaleWizard) already exists for
  // exactly this case, so don't guess — report not-detected instead.
  return null;
}

// Value must contain at least one digit (real IDs always do) — otherwise a
// coincidental label match on OCR noise could capture a stray word.
const ID_VALUE = "([A-Za-z0-9][A-Za-z0-9\\-\\/]{1,24})";

// Ordered most- to least-specific label, same principle as amounts: try the
// labels least likely to appear on unrelated text first.
const ID_LABEL_PATTERNS = [
  new RegExp(`receipt\\s*(?:#|no\\.?|number)\\s*[:\\-]?\\s*${ID_VALUE}`, "i"),
  new RegExp(`(?:transaction|txn)\\s*(?:id|#|no\\.?|number)?\\s*[:\\-]?\\s*${ID_VALUE}`, "i"),
  new RegExp(`payment\\s*(?:id|#|no\\.?|number)\\s*[:\\-]?\\s*${ID_VALUE}`, "i"),
  new RegExp(`ref(?:erence)?\\s*(?:#|no\\.?)?\\s*[:\\-]?\\s*${ID_VALUE}`, "i"),
  new RegExp(`order\\s*(?:#|no\\.?|number)\\s*[:\\-]?\\s*${ID_VALUE}`, "i"),
  new RegExp(`invoice\\s*(?:#|no\\.?|number)\\s*[:\\-]?\\s*${ID_VALUE}`, "i"),
];

function parsePaymentId(text: string): string | null {
  for (const re of ID_LABEL_PATTERNS) {
    const m = text.match(re);
    if (m?.[1] && /\d/.test(m[1])) return m[1].trim();
  }
  // No labeled ID found. Previously this fell back to "any long alphanumeric
  // code-shaped string in the text" with no label at all — the same class
  // of blind-guess bug as the old amount fallback, just for IDs. Don't
  // guess; the manual-entry fallback UI covers this.
  return null;
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

// Builds an ISO date from explicit, already-disambiguated parts — never
// goes through `new Date(someString)`, which guesses at format (see below)
// and through `.toISOString()`, which shifts date-only values by a day in
// any timezone ahead of UTC (local midnight -> earlier UTC day). Also
// rejects calendar-invalid combinations instead of letting JS roll them
// forward (e.g. "Feb 30" silently becoming "Mar 2").
function buildIsoDate(year: number, monthIndex0: number, day: number): string | null {
  if (monthIndex0 < 0 || monthIndex0 > 11 || day < 1 || day > 31) return null;
  const d = new Date(year, monthIndex0, day);
  if (d.getFullYear() !== year || d.getMonth() !== monthIndex0 || d.getDate() !== day) return null;
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// A bare numeric date like "14/08/2026" is genuinely ambiguous between
// DD/MM/YYYY and MM/DD/YYYY — this is exactly what broke "Receipt Date:
// 14/08/2026": the regex captured it fine, but `new Date("14/08/2026")`
// assumes US MM/DD/YYYY, "14" isn't a valid month, and the whole match was
// silently discarded as an Invalid Date. This app's receipts are Pakistan/
// PKR-based, so DD/MM/YYYY is the correct default — try that first. Only
// fall back to MM/DD/YYYY if DD/MM produces an impossible month (>12),
// which isn't a guess: if one reading is calendar-invalid, the other is
// the only remaining option.
function parseAmbiguousNumericDate(a: number, b: number, year: number): string | null {
  const yr = year < 100 ? 2000 + year : year;
  return buildIsoDate(yr, b - 1, a) ?? buildIsoDate(yr, a - 1, b);
}

function monthFromName(name: string): number | undefined {
  return MONTH_INDEX[name.slice(0, 3).toLowerCase()];
}

// One shared, named-group date-value pattern reused by every label below —
// each alternative parsed with its own explicit logic rather than handed
// to `new Date()` as a string. Groups are suffixed per alternative since
// group names must be unique within a single regex.
const DATE_VALUE =
  "(?:(?<y1>\\d{4})-(?<m1>\\d{1,2})-(?<d1>\\d{1,2})" +
  "|(?<d2>\\d{1,2})[/-](?<m2>\\d{1,2})[/-](?<y2>\\d{2,4})" +
  "|(?<d3>\\d{1,2})\\s+(?<mon3>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?,?\\s+(?<y3>\\d{2,4})" +
  "|(?<mon4>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+(?<d4>\\d{1,2}),?\\s+(?<y4>\\d{2,4}))";

// Ordered most- to least-specific label. Deliberately does NOT include "Due
// Date" / "Expiry" / "Payment Due" — a receipt commonly has both an issue
// date and a due date, and the due date is not what we want to auto-fill as
// "when this payment happened". The final bare "date" pattern uses a
// negative lookbehind to skip past those specifically, rather than risk
// matching "Due Date" just because it also contains the word "date".
const DATE_LABEL_PATTERNS = [
  new RegExp(`receipt\\s*date\\s*[:\\-]?\\s*${DATE_VALUE}`, "i"),
  new RegExp(`transaction\\s*date\\s*[:\\-]?\\s*${DATE_VALUE}`, "i"),
  new RegExp(`issue(?:d)?\\s*(?:date|on)?\\s*[:\\-]?\\s*${DATE_VALUE}`, "i"),
  new RegExp(
    `(?<!due\\s)(?<!expiry\\s)(?<!expires\\s)(?<!payable\\s)\\bdate\\b\\s*[:\\-]?\\s*${DATE_VALUE}`,
    "i",
  ),
];

function resolveDateMatch(groups: Record<string, string | undefined>): string | null {
  if (groups.y1) return buildIsoDate(Number(groups.y1), Number(groups.m1) - 1, Number(groups.d1));
  if (groups.d2)
    return parseAmbiguousNumericDate(Number(groups.d2), Number(groups.m2), Number(groups.y2));
  if (groups.d3 && groups.mon3) {
    const mi = monthFromName(groups.mon3);
    const yr = Number(groups.y3) < 100 ? 2000 + Number(groups.y3) : Number(groups.y3);
    return mi === undefined ? null : buildIsoDate(yr, mi, Number(groups.d3));
  }
  if (groups.mon4 && groups.d4) {
    const mi = monthFromName(groups.mon4);
    const yr = Number(groups.y4) < 100 ? 2000 + Number(groups.y4) : Number(groups.y4);
    return mi === undefined ? null : buildIsoDate(yr, mi, Number(groups.d4));
  }
  return null;
}

function parseDate(text: string): string | null {
  for (const re of DATE_LABEL_PATTERNS) {
    const m = text.match(re);
    if (m?.groups) {
      const resolved = resolveDateMatch(m.groups);
      if (resolved) return resolved;
    }
  }
  // No labeled date found — same "don't guess" principle. An earlier
  // version matched the first date-shaped string anywhere in the text with
  // no label at all, which on a receipt with both a receipt date and a due
  // date had a coin-flip chance of picking the wrong one.
  return null;
}

// Tesseract fetches its core (WASM) and language data from a CDN on first
// use — confirmed via a live test this takes ~9s on a fresh worker even on
// a fast connection, and there is no local fallback. A silent hang (e.g. a
// slow/flaky mobile connection out at a silo) previously looked identical
// to "OCR doesn't work" with nothing in the console to tell them apart —
// this bounds it and reports clearly which stage failed.
const TESSERACT_TIMEOUT_MS = 25_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Runs OCR on a receipt image and extracts structured payment details.
 * Returns nulls for any field it can't confidently parse — callers should
 * treat this as a best-effort auto-fill and let the admin still submit
 * a partially-filled form if OCR misses a field.
 *
 * Tesseract.js is loaded lazily at runtime — it is a large WASM bundle and
 * only needed when the user actually uploads a receipt image, and it can
 * only run in a browser (Web Workers + WASM), never during SSR. A plain
 * `await import("tesseract.js")` is what Vite expects: it lets Vite's
 * bundler see and code-split the specifier normally, both in dev and in
 * the production client build (it's already listed in optimizeDeps in
 * vite.config.ts). This function is only ever called from a client-side
 * `onChange` handler (see DispatchSaleWizard.tsx), so the import never
 * actually executes during SSR regardless — but the `typeof window`
 * guard below is kept as an explicit belt-and-suspenders check, since an
 * earlier version of this file used exactly that guard for exactly this
 * reason before a later merge replaced it with a `new Function("s",
 * "return import(s)")` trick meant to hide the specifier from Vite's
 * static analysis. That trick doesn't work: browsers can't resolve a
 * bare module specifier like "tesseract.js" via a dynamic import that
 * didn't go through Vite's rewrite, so it always failed at runtime with
 * "Failed to resolve module specifier 'tesseract.js'" — silently, since
 * the failure landed in a catch block that just returned an empty result.
 *
 * If tesseract.js is not available, its worker never initializes, or
 * recognition itself fails, this returns empty/null fields and a confidence
 * of 0 instead of crashing — but every one of those paths logs exactly
 * which stage failed and why (check the browser console).
 */
export async function extractPaymentDetails(imageFile: File): Promise<ExtractedPaymentDetails> {
  const empty: ExtractedPaymentDetails = {
    paymentId: null,
    amount: null,
    date: null,
    rawText: "",
    confidence: 0,
  };

  if (typeof window === "undefined") {
    console.warn(
      "[ocr] extractPaymentDetails called outside the browser — OCR is client-only, skipping",
    );
    return empty;
  }

  let createWorker:
    | ((lang: string, oem?: number, options?: Record<string, unknown>) => Promise<any>)
    | null = null;
  try {
    const mod = await import("tesseract.js");
    createWorker =
      mod.createWorker ??
      (mod as unknown as { default?: { createWorker?: typeof mod.createWorker } }).default
        ?.createWorker ??
      null;
  } catch (err) {
    console.error("[ocr] Failed to load the tesseract.js module:", err);
    return empty;
  }

  if (!createWorker) {
    console.error("[ocr] tesseract.js loaded but its createWorker export is missing");
    return empty;
  }

  console.log("[ocr] Creating Tesseract worker (fetches core + language data on first use)…");
  const workerStart = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let worker: any;
  try {
    worker = await withTimeout(
      createWorker("eng", 1, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger: (m: any) => console.log("[ocr:tesseract]", m?.status, m?.progress),
      }),
      TESSERACT_TIMEOUT_MS,
      "Tesseract worker initialization",
    );
    console.log(`[ocr] Worker ready in ${Date.now() - workerStart}ms`);
  } catch (err) {
    console.error(
      "[ocr] Worker initialization failed or timed out — most likely a network issue reaching Tesseract's CDN-hosted core/language files:",
      err,
    );
    return empty;
  }

  try {
    console.log("[ocr] Running recognize()…");
    const recognizeStart = Date.now();
    const { data } = await withTimeout<{ data: { text: string; confidence: number } }>(
      worker.recognize(imageFile),
      TESSERACT_TIMEOUT_MS,
      "OCR recognition",
    );
    const rawText = data.text ?? "";
    console.log(
      `[ocr] recognize() finished in ${Date.now() - recognizeStart}ms, confidence=${data.confidence}`,
    );
    console.log("[ocr] Raw text:", JSON.stringify(rawText));
    return {
      paymentId: parsePaymentId(rawText),
      amount: parseAmount(rawText),
      date: parseDate(rawText),
      rawText,
      confidence: data.confidence ?? 0,
    };
  } catch (error) {
    console.error("[ocr] Recognition failed or timed out:", error);
    return empty;
  } finally {
    await worker.terminate().catch(() => {});
  }
}
