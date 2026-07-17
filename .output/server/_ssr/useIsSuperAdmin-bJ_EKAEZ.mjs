import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as getMyRole } from "./roles.functions-DsCBlTtJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/useIsSuperAdmin-bJ_EKAEZ.js
/** Cached role check. Returns `true` only when the user is a super_admin. */
function useIsSuperAdmin() {
	const fetchRole = useServerFn(getMyRole);
	const q = useQuery({
		queryKey: ["my-role"],
		queryFn: () => fetchRole(),
		staleTime: 6e4
	});
	return {
		isSuperAdmin: q.data?.role === "super_admin",
		role: q.data?.role ?? null,
		isLoading: q.isLoading
	};
}
//#endregion
export { useIsSuperAdmin as t };
