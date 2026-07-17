import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { a as numberType, c as stringType, n as booleanType, o as objectType, s as recordType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform-settings.functions-De0GKDow.js
var DEFAULT_CONFIG = {
	maintenance_mode: false,
	feature_flags: {},
	default_thresholds: {}
};
var getPlatformSettings_createServerFn_handler = createServerRpc({
	id: "20a5a6762755201e06f04062d7354e12f8225eff47615ebb8eb8cf21f69364d8",
	name: "getPlatformSettings",
	filename: "src/lib/platform-settings.functions.ts"
}, (opts) => getPlatformSettings.__executeServer(opts));
var getPlatformSettings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getPlatformSettings_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("platform_settings").select("config").eq("id", "singleton").maybeSingle();
	if (error) throw error;
	const cfg = data?.config ?? {};
	return {
		maintenance_mode: cfg.maintenance_mode ?? DEFAULT_CONFIG.maintenance_mode,
		feature_flags: cfg.feature_flags ?? DEFAULT_CONFIG.feature_flags,
		default_thresholds: cfg.default_thresholds ?? DEFAULT_CONFIG.default_thresholds
	};
});
var configSchema = objectType({
	maintenance_mode: booleanType(),
	feature_flags: recordType(stringType(), booleanType()),
	default_thresholds: recordType(stringType(), numberType())
});
var updatePlatformSettings_createServerFn_handler = createServerRpc({
	id: "1e7676f46551fd59b2c5a298b73ff3b18ac3454cf7194f48a4077c32ce542c4c",
	name: "updatePlatformSettings",
	filename: "src/lib/platform-settings.functions.ts"
}, (opts) => updatePlatformSettings.__executeServer(opts));
var updatePlatformSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => configSchema.parse(data)).handler(updatePlatformSettings_createServerFn_handler, async ({ data, context }) => {
	const { isSuperAdmin } = await import("./rbac.server-BDKrrmZN.mjs");
	if (!await isSuperAdmin(context.supabase, context.userId)) throw new Error("Forbidden");
	const { error } = await context.supabase.from("platform_settings").upsert({
		id: "singleton",
		config: data,
		updated_by: context.userId
	});
	if (error) throw error;
	return { ok: true };
});
//#endregion
export { getPlatformSettings_createServerFn_handler, updatePlatformSettings_createServerFn_handler };
