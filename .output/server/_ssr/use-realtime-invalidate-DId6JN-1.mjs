import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as supabase } from "./client-CrfNFjZ6.mjs";
import { i as useQueryClient } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-realtime-invalidate-DId6JN-1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
/**
* Subscribe to Postgres changes on a table and invalidate the given
* react-query keys whenever a row changes. Safe under strict mode:
* unsubscribes on unmount.
*/
function useRealtimeInvalidate(table, queryKeys) {
	const qc = useQueryClient();
	(0, import_react.useEffect)(() => {
		const channel = supabase.channel(`rt-${table}-${Math.random().toString(36).slice(2, 8)}`).on("postgres_changes", {
			event: "*",
			schema: "public",
			table
		}, () => {
			for (const key of queryKeys) qc.invalidateQueries({ queryKey: key });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [table]);
}
//#endregion
export { useRealtimeInvalidate as t };
