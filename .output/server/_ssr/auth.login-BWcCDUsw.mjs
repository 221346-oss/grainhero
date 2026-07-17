import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { t as supabase } from "./client-CrfNFjZ6.mjs";
import { ft as Mail, ht as LoaderCircle } from "../_libs/lucide-react.mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Label } from "./label-BPuF5-mq.mjs";
import { n as Message, t as AuthShell } from "./AuthShell-DLGMETs1.mjs";
import { t as Route } from "./auth.login-BWrYCeNK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth.login-BWcCDUsw.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LoginPage() {
	const navigate = useNavigate();
	const { prefill, redirect, reason } = Route.useSearch();
	const [email, setEmail] = (0, import_react.useState)(prefill ?? "");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [msg, setMsg] = (0, import_react.useState)(reason === "idle" ? {
		type: "info",
		text: "You were signed out for inactivity."
	} : reason === "expired" ? {
		type: "info",
		text: "Your session expired. Please sign in again."
	} : reason === "external" ? {
		type: "info",
		text: "Signed out from another tab."
	} : null);
	(0, import_react.useEffect)(() => {
		supabase.auth.getSession().then(({ data }) => {
			if (data.session?.user) navigate({
				to: redirect ?? "/dashboard",
				replace: true
			});
		});
	}, [navigate, redirect]);
	const submit = async (e) => {
		e.preventDefault();
		setMsg(null);
		setLoading(true);
		const normalizedEmail = email.trim().toLowerCase();
		const { error } = await supabase.auth.signInWithOtp({
			email: normalizedEmail,
			options: { shouldCreateUser: false }
		});
		setLoading(false);
		if (error) {
			setMsg({
				type: "error",
				text: error.message
			});
			return;
		}
		navigate({
			to: "/auth/verify-otp",
			search: { email: normalizedEmail }
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold",
					children: "Welcome back"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Enter your email — we'll send a 6-digit code"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "li-email",
							children: "Email"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "li-email",
								type: "email",
								value: email,
								onChange: (e) => setEmail(e.target.value),
								placeholder: "you@company.com",
								autoComplete: "email",
								className: "pl-9",
								required: true,
								autoFocus: true
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Message, { msg }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: loading,
						className: "w-full bg-[#00a63e] hover:bg-[#029238] text-white",
						children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : "Send code"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-center text-muted-foreground",
				children: [
					"New to GrainHero?",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/checkout",
						className: "text-[#00a63e] font-medium hover:underline",
						children: "Choose a plan first"
					})
				]
			})
		]
	}) });
}
//#endregion
export { LoginPage as component };
