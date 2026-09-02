import { describe, expect, it } from "vitest";
import {
  countActiveSince,
  daysBetween,
  toPlan,
  type AccountMember,
} from "../../src/lib/account-usage.server";

const NOW = "2026-09-03T00:00:00.000Z";

function member(over: Partial<AccountMember> = {}): AccountMember {
  return { id: "u", role: "manager", lastActiveAt: null, loginCount: 0, ...over };
}

describe("daysBetween", () => {
  it("counts whole days forward", () => {
    expect(daysBetween(NOW, "2026-09-13T00:00:00.000Z")).toBe(10);
  });

  it("goes negative once the date is past", () => {
    // What makes an expired subscription read as expired rather than as due.
    expect(daysBetween(NOW, "2026-08-30T00:00:00.000Z")).toBe(-4);
  });

  it("is null rather than zero when either end is missing", () => {
    // A plan with no end date has an unknown remaining term, not a term of
    // zero — the difference between "no renewal set" and "expires today".
    expect(daysBetween(NOW, null)).toBeNull();
    expect(daysBetween(null, NOW)).toBeNull();
  });

  it("is null for an unparseable date rather than NaN", () => {
    expect(daysBetween(NOW, "not-a-date")).toBeNull();
  });
});

describe("countActiveSince", () => {
  const since = "2026-08-04T00:00:00.000Z";

  it("counts only people seen since the cutoff", () => {
    const members = [
      member({ id: "a", lastActiveAt: "2026-09-01T00:00:00.000Z" }),
      member({ id: "b", lastActiveAt: "2026-07-01T00:00:00.000Z" }),
    ];
    expect(countActiveSince(members, since)).toBe(1);
  });

  it("treats never-seen as inactive, not as active", () => {
    // last_active_at is null for anyone not seen since the column was added.
    // Counting them would make the seats look better used than they are.
    expect(countActiveSince([member({ lastActiveAt: null })], since)).toBe(0);
  });

  it("is zero for an empty account rather than throwing", () => {
    expect(countActiveSince([], since)).toBe(0);
  });
});

describe("toPlan", () => {
  it("reports no plan without inventing one", () => {
    const p = toPlan(null, NOW);
    expect(p.name).toBeNull();
    expect(p.pricePerMonth).toBe(0);
    expect(p.daysRemaining).toBeNull();
    // An account with no subscription is not an account on auto-renew.
    expect(p.autoRenew).toBe(false);
  });

  it("carries the subscription through and dates the term", () => {
    const p = toPlan(
      {
        plan_name: "premium",
        status: "active",
        price_per_month: 12000,
        currency: "PKR",
        billing_cycle: "monthly",
        auto_renew: true,
        next_payment_date: "2026-10-01T00:00:00.000Z",
        end_date: "2026-10-03T00:00:00.000Z",
      },
      NOW,
    );
    expect(p.name).toBe("premium");
    expect(p.pricePerMonth).toBe(12000);
    expect(p.daysRemaining).toBe(30);
  });

  it("defaults the currency rather than rendering an empty one", () => {
    const p = toPlan(
      {
        plan_name: "basic",
        status: "trial",
        price_per_month: null,
        currency: null,
        billing_cycle: null,
        auto_renew: null,
        next_payment_date: null,
        end_date: null,
      },
      NOW,
    );
    expect(p.currency).toBe("PKR");
    expect(p.pricePerMonth).toBe(0);
  });
});
