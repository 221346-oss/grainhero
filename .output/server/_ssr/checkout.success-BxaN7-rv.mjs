import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { t as supabase } from "./client-CrfNFjZ6.mjs";
import { Qt as CircleCheck, ht as LoaderCircle, nt as PartyPopper } from "../_libs/lucide-react.mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { n as CardContent, t as Card } from "./card-CkAivaVl.mjs";
import { r as getCheckoutSessionSummary } from "./stripe-checkout.functions-B_A1yuT4.mjs";
import { t as autoConfirmUserEmail } from "./auth-verification-email.functions-DCIUaQUa.mjs";
import { sendCheckoutConfirmationEmail } from "./checkout-emails.functions-BjkdsGHa.mjs";
import { t as Route } from "./checkout.success-BRLziX57.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/checkout.success-BxaN7-rv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var DRAFT_KEY = "grainhero.checkoutDraft.v1";
function readDraft() {
	try {
		const raw = typeof window !== "undefined" ? window.localStorage.getItem(DRAFT_KEY) : null;
		if (!raw) return {
			customerEmail: "",
			customerName: "",
			customerPassword: ""
		};
		const d = JSON.parse(raw);
		return {
			customerEmail: d.customerEmail ?? "",
			customerName: d.customerName ?? "",
			customerPassword: d.customerPassword ?? ""
		};
	} catch {
		return {
			customerEmail: "",
			customerName: "",
			customerPassword: ""
		};
	}
}
function SuccessPage() {
	const navigate = useNavigate();
	const { session_id: sessionId } = Route.useSearch();
	const summaryFn = useServerFn(getCheckoutSessionSummary);
	const confirmFn = useServerFn(autoConfirmUserEmail);
	const sendConfirmFn = useServerFn(sendCheckoutConfirmationEmail);
	const [status, setStatus] = (0, import_react.useState)("loading");
	const [errorMsg, setErrorMsg] = (0, import_react.useState)("");
	const ran = (0, import_react.useRef)(false);
	const confirmEmailSent = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		if (!sessionId || confirmEmailSent.current) return;
		confirmEmailSent.current = true;
		sendConfirmFn({ data: { sessionId } }).catch((e) => console.warn("[confirm email]", e.message));
	}, [sendConfirmFn, sessionId]);
	(0, import_react.useEffect)(() => {
		if (ran.current) return;
		ran.current = true;
		(async () => {
			const draft = readDraft();
			let email = draft.customerEmail;
			const password = draft.customerPassword;
			const name = draft.customerName;
			if (!email && sessionId) try {
				email = (await summaryFn({ data: { sessionId } }))?.email ?? "";
			} catch {}
			if (!email) {
				navigate({
					to: "/auth/login",
					replace: true
				});
				return;
			}
			if (!password) {
				try {
					window.localStorage.removeItem(DRAFT_KEY);
				} catch {}
				navigate({
					to: "/auth/login",
					search: { prefill: email },
					replace: true
				});
				return;
			}
			setStatus("creating_account");
			const { error: signUpError } = await supabase.auth.signUp({
				email,
				password,
				options: { data: {
					name,
					business_type: "farm"
				} }
			});
			if (signUpError && !signUpError.message.toLowerCase().includes("already registered")) {
				setStatus("error");
				setErrorMsg(signUpError.message);
				return;
			}
			try {
				await confirmFn({ data: { email } });
			} catch (e) {
				console.warn("[success] auto-confirm failed:", e.message);
			}
			try {
				window.localStorage.removeItem(DRAFT_KEY);
			} catch {}
			setStatus("done");
			setTimeout(() => {
				navigate({
					to: "/auth/login",
					search: { prefill: email },
					replace: true
				});
			}, 800);
		})();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen flex items-center justify-center px-4",
		style: { background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)" },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "max-w-sm w-full shadow-xl",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-8 text-center space-y-4",
				children: status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mx-auto h-14 w-14 rounded-full bg-red-100 flex items-center justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PartyPopper, { className: "h-7 w-7 text-red-500" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-xl font-bold text-slate-900",
						children: "Something went wrong"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-slate-600",
						children: errorMsg
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "w-full bg-[#00a63e] hover:bg-[#029238] text-white",
						onClick: () => navigate({ to: "/auth/login" }),
						children: "Go to login"
					})
				] }) : status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-7 w-7 text-emerald-600" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-xl font-bold text-slate-900",
						children: "Payment confirmed!"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-slate-600",
						children: "Taking you to login…"
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-10 w-10 animate-spin text-emerald-600 mx-auto" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium text-slate-700",
					children: {
						loading: "Confirming your payment…",
						creating_account: "Setting up your account…",
						done: "Account ready! Taking you to login…",
						error: errorMsg || "Something went wrong."
					}[status]
				})] })
			})
		})
	});
}
//#endregion
export { SuccessPage as component };
