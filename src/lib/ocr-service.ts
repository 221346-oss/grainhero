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

function parseAmount(text: string): number | null {
  const patterns = [
    /(?:amount|amt|total|paid|rs\.?|pkr)\s*[:-]?\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /([\d,]{4,}(?:\.\d{1,2})?)\s*(?:pkr|rs\.?)/gi,
  ];
  for (const re of patterns) {
    const matches = [...text.matchAll(re)];
    if (matches.length > 0) {
      const raw = matches[0][1].replace(/,/g, "");
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  // Fallback: largest plausible number in the text (receipts usually lead with the amount).
  const numbers = [...text.matchAll(/[\d,]{3,}(?:\.\d{1,2})?/g)]
    .map((m) => Number(m[0].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (numbers.length === 0) return null;
  return Math.max(...numbers);
}

function parsePaymentId(text: string): string | null {
  const patterns = [
    /(?:txn|transaction)\s*(?:id|no|#)?\s*[:-]?\s*([A-Za-z0-9-]{5,})/i,
    /(?:ref(?:erence)?)\s*(?:no|#)?\s*[:-]?\s*([A-Za-z0-9-]{5,})/i,
    /(?:payment|receipt)\s*(?:id|no|#)\s*[:-]?\s*([A-Za-z0-9-]{5,})/i,
    /\b([A-Z0-9]{2,}[- ]?[A-Z0-9]{6,})\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function parseDate(text: string): string | null {
  const patterns = [
    /\b(\d{4}-\d{2}-\d{2})\b/,
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/,
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const d = new Date(m[1]);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

/**
 * Runs OCR on a receipt image and extracts structured payment details.
 * Returns nulls for any field it can't confidently parse — callers should
 * treat this as a best-effort auto-fill and let the admin still submit
 * a partially-filled form if OCR misses a field.
 */
/**
 * Runs OCR on a receipt image and extracts structured payment details.
 * Tesseract.js is loaded lazily at runtime — it is a large WASM bundle and
 * only needed when the user actually uploads a receipt image. The dynamic
 * import keeps it out of the initial bundle so Vite never tries to resolve
 * it at build time for environments where it isn't installed.
 *
 * If tesseract.js is not available (package not installed), the function
 * returns empty/null fields and a confidence of 0 instead of crashing.
 */
export async function extractPaymentDetails(imageFile: File): Promise<ExtractedPaymentDetails> {
  let createWorker: ((lang: string) => Promise<any>) | null = null;
  try {
    // Dynamic import keeps tesseract.js out of the Vite static analysis pass.
    // Use Function constructor to prevent Vite from statically resolving the specifier.
    const mod = await (new Function('s', 'return import(s)'))("tesseract.js") as any;
    createWorker = mod.createWorker ?? mod.default?.createWorker ?? null;
  } catch {
    // tesseract.js not installed — return empty result gracefully
    return { paymentId: null, amount: null, date: null, rawText: "", confidence: 0 };
  }

  if (!createWorker) {
    return { paymentId: null, amount: null, date: null, rawText: "", confidence: 0 };
  }

  const worker = await createWorker("eng");
  try {
    // Dynamic import with better error handling
    const tesseract = await import("tesseract.js");
    const worker = await tesseract.createWorker("eng");
    
    try {
      const { data } = await worker.recognize(imageFile);
      const rawText = data.text ?? "";
      return {
        paymentId: parsePaymentId(rawText),
        amount: parseAmount(rawText),
        date: parseDate(rawText),
        rawText,
        confidence: data.confidence ?? 0,
      };
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.error("OCR processing failed:", error);
    // Return empty result if OCR fails
    return {
      paymentId: null,
      amount: null,
      date: null,
      rawText: "",
      confidence: 0,
    };
  } finally {
    await worker.terminate().catch(() => {});
  }
}
