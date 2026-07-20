//#region node_modules/.nitro/vite/services/ssr/assets/pricing-data-BA_Y9Elr.js
var pricingData = [
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
			"AI Predictions"
		],
		iotCharge: 7e3,
		iotChargeLabel: "Rs. 7,000 one-time setup fee",
		priceId: "price_starter_1499",
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
			storage: 10
		}
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
			"AI Predictions"
		],
		iotCharge: 7e3,
		iotChargeLabel: "Rs. 7,000 one-time setup fee",
		priceId: "price_professional_3899",
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
			storage: 50
		}
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
			"AI Predictions"
		],
		iotCharge: 7e3,
		iotChargeLabel: "Rs. 7,000 one-time setup fee",
		priceId: "price_enterprise_5999",
		price: 5999,
		currency: "PKR",
		duration: "/month",
		interval: "month",
		popular: false,
		limits: {
			warehouses: 5,
			silos: 15,
			users: -1,
			managers: -1,
			technicians: -1,
			storage: -1
		}
	}
];
function resolvePlanId(raw) {
	if (!raw) return null;
	const trimmed = raw.trim().toLowerCase();
	if (trimmed === "basic" || trimmed === "intermediate" || trimmed === "pro") return trimmed;
	return pricingData.find((p) => p.id === trimmed || p.name.toLowerCase() === trimmed || `grain ${p.name.toLowerCase()}` === trimmed)?.id ?? null;
}
function getCheckoutTotals(planId, iotQuantity) {
	const plan = pricingData.find((p) => p.id === planId);
	if (!plan) return null;
	const iotUnit = Number(plan.iotCharge ?? 7e3);
	const qty = Math.max(1, Math.min(50, iotQuantity));
	const iotTotal = qty * iotUnit;
	const monthlyPrice = Number(plan.price ?? 0);
	return {
		plan,
		iotQuantity: qty,
		iotUnit,
		iotTotal,
		monthlyPrice,
		dueToday: monthlyPrice + iotTotal
	};
}
//#endregion
export { pricingData as n, resolvePlanId as r, getCheckoutTotals as t };
