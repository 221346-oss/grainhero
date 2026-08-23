const pricingData = [
  {
    id: "basic",
    name: "Starter",
    priceFrontend: "Rs. 1,499/mo",
    description: "Perfect for small grain operations with a single warehouse.",
    features: [
      "1 Warehouse",
      "3 Silos",
      "5 Staff (2 Managers + 3 Technicians)",
      "Mobile Panel",
      "Web Panel",
      "AI Predictions",
    ],
    iotCharge: 7000,
    iotChargeLabel: "Rs. 7,000 one-time setup fee",

    priceId: "price_starter_1499", // Update with actual Stripe price ID
    price: 1499,
    currency: "PKR",
    duration: "/month",
    interval: "month",
    popular: false,
    limits: {
      warehouses: 1,
      silos: 3,
      users: 5,
      managers: 2,
      technicians: 3,
      storage: 10,
    },
  },
  {
    id: "intermediate",
    name: "Professional",
    priceFrontend: "Rs. 3,899/mo",
    description: "Advanced features for growing grain operations with multiple warehouses.",
    features: [
      "2 Warehouses",
      "6 Silos",
      "10 Staff",
      "Mobile Panel",
      "Web Panel",
      "AI Predictions",
    ],
    iotCharge: 7000,
    iotChargeLabel: "Rs. 7,000 one-time setup fee",

    priceId: "price_professional_3899", // Update with actual Stripe price ID
    price: 3899,
    currency: "PKR",
    duration: "/month",
    interval: "month",
    popular: true,
    limits: {
      warehouses: 2,
      silos: 6,
      users: 10,
      managers: -1,
      technicians: -1,
      storage: 50,
    },
  },
  {
    id: "pro",
    name: "Enterprise",
    priceFrontend: "Rs. 5,999/mo",
    description: "Complete solution for large grain operations with unlimited staff.",
    features: [
      "5 Warehouses",
      "15 Silos",
      "Unlimited Staff",
      "Mobile Panel",
      "Web Panel",
      "AI Predictions",
    ],
    iotCharge: 7000,
    iotChargeLabel: "Rs. 7,000 one-time setup fee",

    priceId: "price_enterprise_5999", // Update with actual Stripe price ID
    price: 5999,
    currency: "PKR",
    duration: "/month",
    interval: "month",
    popular: false,
    limits: {
      warehouses: 5,
      silos: 15,
      users: -1, // unlimited
      managers: -1,
      technicians: -1,
      storage: -1, // unlimited
    },
  },
];

export type PlanId = "basic" | "intermediate" | "pro";

export function resolvePlanId(raw?: string | null): PlanId | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "basic" || trimmed === "intermediate" || trimmed === "pro") return trimmed;
  const byName = pricingData.find(
    (p) =>
      p.id === trimmed ||
      p.name.toLowerCase() === trimmed ||
      `grain ${p.name.toLowerCase()}` === trimmed,
  );
  return (byName?.id as PlanId) ?? null;
}

export function getCheckoutTotals(planId: string, iotQuantity: number) {
  const plan = pricingData.find((p) => p.id === planId);
  if (!plan) return null;
  const iotUnit = Number(plan.iotCharge ?? 7000);
  const qty = Math.max(1, Math.min(50, iotQuantity));
  const iotTotal = qty * iotUnit;
  const monthlyPrice = Number(plan.price ?? 0);
  return {
    plan,
    iotQuantity: qty,
    iotUnit,
    iotTotal,
    monthlyPrice,
    dueToday: monthlyPrice + iotTotal,
  };
}

export default pricingData;
