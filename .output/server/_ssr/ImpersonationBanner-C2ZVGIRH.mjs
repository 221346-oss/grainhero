import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { h as UserCog, n as X } from "../_libs/lucide-react.mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { i as useQueryClient, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ImpersonationBanner-C2ZVGIRH.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var startImpersonation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("5b1de10c308e266e3f23e21e073938fa6f09ebe5ca1220f58917040a6c56605b"));
var stopImpersonation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("2ef214d2dc1ef62c296192dee38d880f1c348549a233c6bccd79c767c89ff98e"));
var STORAGE_KEY = "gh_impersonation_session";
var CHANGE_EVENT = "gh_impersonation_changed";
/** Read the current impersonation session from localStorage */
function getImpersonationSession() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
/** Save an impersonation session and notify same-tab listeners */
function saveImpersonationSession(session) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
	window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}
/** Clear the impersonation session and notify same-tab listeners */
function clearImpersonationSession() {
	localStorage.removeItem(STORAGE_KEY);
	window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}
function ImpersonationBanner() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const stopFn = useServerFn(stopImpersonation);
	const [session, setSession] = (0, import_react.useState)(() => getImpersonationSession());
	(0, import_react.useEffect)(() => {
		const load = () => setSession(getImpersonationSession());
		window.addEventListener("storage", load);
		window.addEventListener(CHANGE_EVENT, load);
		return () => {
			window.removeEventListener("storage", load);
			window.removeEventListener(CHANGE_EVENT, load);
		};
	}, []);
	const stopMutation = useMutation({
		mutationFn: () => stopFn(),
		onSuccess: () => {
			clearImpersonationSession();
			setSession(null);
			toast.success("Stopped impersonation");
			queryClient.invalidateQueries();
			navigate({ to: "/platform/users" });
		},
		onError: (error) => {
			toast.error(error.message);
		}
	});
	if (!session) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "bg-amber-100 border-b border-amber-200 px-4 py-2",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-7xl mx-auto flex items-center justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-amber-800",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserCog, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-sm font-medium",
					children: [
						"Viewing as",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-semibold",
							children: session.adminName || session.adminEmail || "Unknown User"
						}),
						session.businessType && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-amber-700 ml-1",
							children: [
								"(",
								session.businessType,
								")"
							]
						})
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				variant: "outline",
				onClick: () => stopMutation.mutate(),
				disabled: stopMutation.isPending,
				className: "bg-white hover:bg-amber-50 border-amber-300 text-amber-800",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3 w-3 mr-1" }), "Exit Impersonation"]
			})]
		})
	});
}
//#endregion
export { startImpersonation as i, getImpersonationSession as n, saveImpersonationSession as r, ImpersonationBanner as t };
