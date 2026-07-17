import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMySubscription } from "@/lib/billing.functions";
import pricingData from "@/lib/pricing-data";

/**
 * Returns current plan limits and live usage counts.
 * Used by Silos, Warehouses pages to gate the "New" button.
 */
export function usePlanLimits() {
  const fn = useServerFn(getMySubscription);
  const { data, isLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });

  const sub = data?.subscription;
  const usage = data?.usage ?? { warehouses: 0, silos: 0, devices: 0, users: 0, batches: 0 };

  // Determine limits from the subscription plan name (matched against pricing-data)
  // Fall back to the subscription table's own max_* columns if available.
  const planId = (() => {
    const raw = (sub?.plan_name ?? "").toLowerCase();
    if (raw.includes("starter") || raw.includes("basic")) return "basic";
    if (raw.includes("professional") || raw.includes("intermediate")) return "intermediate";
    if (raw.includes("enterprise") || raw.includes("pro")) return "pro";
    return null;
  })();

  const planLimits = pricingData.find((p) => p.id === planId)?.limits ?? null;

  // Prefer subscription table columns (set by webhook), fall back to pricing-data.
  const maxSilos: number =
    (sub as { max_silos?: number } | null)?.max_silos ??
    planLimits?.silos ??
    -1; // -1 = unlimited

  const maxWarehouses: number =
    (sub as { max_warehouses?: number } | null)?.max_warehouses ??
    planLimits?.warehouses ??
    -1;

  const maxUsers: number =
    (Number((sub as { max_users?: number } | null)?.max_users ?? 0) ||
    planLimits?.users) ??
    -1;

  const canAddSilo =
    !sub // no subscription at all — don't block (super_admin / no billing)
      ? true
      : maxSilos === -1 || usage.silos < maxSilos;

  const canAddWarehouse =
    !sub
      ? true
      : maxWarehouses === -1 || usage.warehouses < maxWarehouses;

  const siloLimitMessage =
    maxSilos > 0 && !canAddSilo
      ? `Silo limit reached (${usage.silos}/${maxSilos}). Upgrade your plan to add more.`
      : null;

  const warehouseLimitMessage =
    maxWarehouses > 0 && !canAddWarehouse
      ? `Warehouse limit reached (${usage.warehouses}/${maxWarehouses}). Upgrade your plan to add more.`
      : null;

  return {
    isLoading,
    canAddSilo,
    canAddWarehouse,
    siloLimitMessage,
    warehouseLimitMessage,
    usage,
    maxSilos,
    maxWarehouses,
    maxUsers,
    planId,
  };
}
