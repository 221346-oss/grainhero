import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as pricingData } from "./pricing-data-BA_Y9Elr.mjs";
import { n as getMySubscription } from "./billing.functions-CNrpoOgJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/usePlanLimits-BXFy88pf.js
/**
* Returns current plan limits and live usage counts.
* Used by Silos, Warehouses pages to gate the "New" button.
*/
function usePlanLimits() {
	const fn = useServerFn(getMySubscription);
	const { data, isLoading } = useQuery({
		queryKey: ["my-subscription"],
		queryFn: () => fn(),
		staleTime: 3e4
	});
	const sub = data?.subscription;
	const usage = data?.usage ?? {
		warehouses: 0,
		silos: 0,
		devices: 0,
		users: 0,
		batches: 0
	};
	const planId = (() => {
		const raw = (sub?.plan_name ?? "").toLowerCase();
		if (raw.includes("starter") || raw.includes("basic")) return "basic";
		if (raw.includes("professional") || raw.includes("intermediate")) return "intermediate";
		if (raw.includes("enterprise") || raw.includes("pro")) return "pro";
		return null;
	})();
	const planLimits = pricingData.find((p) => p.id === planId)?.limits ?? null;
	const maxSilos = sub?.max_silos ?? planLimits?.silos ?? -1;
	const maxWarehouses = sub?.max_warehouses ?? planLimits?.warehouses ?? -1;
	const maxUsers = (Number(sub?.max_users ?? 0) || planLimits?.users) ?? -1;
	const canAddSilo = !sub ? true : maxSilos === -1 || usage.silos < maxSilos;
	const canAddWarehouse = !sub ? true : maxWarehouses === -1 || usage.warehouses < maxWarehouses;
	return {
		isLoading,
		canAddSilo,
		canAddWarehouse,
		siloLimitMessage: maxSilos > 0 && !canAddSilo ? `Silo limit reached (${usage.silos}/${maxSilos}). Upgrade your plan to add more.` : null,
		warehouseLimitMessage: maxWarehouses > 0 && !canAddWarehouse ? `Warehouse limit reached (${usage.warehouses}/${maxWarehouses}). Upgrade your plan to add more.` : null,
		usage,
		maxSilos,
		maxWarehouses,
		maxUsers,
		planId
	};
}
//#endregion
export { usePlanLimits as t };
