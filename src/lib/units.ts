/**
 * Grain is traded locally by the "man" (1 man = 40 kg). Storage stays in kg
 * everywhere (grain_batches, grain_dispatches, buyer_invoices) — this is a
 * display-only conversion layer, never persisted.
 */
export const KG_PER_MAN = 40;

export function kgToMan(kg: number): number {
  return kg / KG_PER_MAN;
}

export function pricePerKgToPerMan(pricePerKg: number): number {
  return pricePerKg * KG_PER_MAN;
}

export function formatMan(kg: number): string {
  return `${kgToMan(kg).toLocaleString(undefined, { maximumFractionDigits: 2 })} man`;
}
