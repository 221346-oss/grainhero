import { describe, expect, it } from "vitest";
import { legacyBatchRevenue } from "../../src/lib/revenue";

describe("legacyBatchRevenue", () => {
  it("trusts the revenue column when the row carries one", () => {
    expect(legacyBatchRevenue({ revenue: 5000, purchase_price_per_kg: 3, quantity_kg: 100 })).toBe(
      5000,
    );
  });

  it("falls back to price x quantity for rows written before that column", () => {
    expect(legacyBatchRevenue({ revenue: null, purchase_price_per_kg: 3, quantity_kg: 200 })).toBe(
      600,
    );
  });

  it("is zero rather than NaN when the row carries nothing usable", () => {
    expect(
      legacyBatchRevenue({ revenue: null, purchase_price_per_kg: null, quantity_kg: null }),
    ).toBe(0);
  });

  it("treats a genuine zero as zero, not as missing", () => {
    // `?? ` rather than `||` matters here: a batch dispatched for nothing is a
    // real outcome, and coercing it to price x quantity would invent revenue.
    expect(legacyBatchRevenue({ revenue: 0, purchase_price_per_kg: 9, quantity_kg: 100 })).toBe(0);
  });
});
