import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { t as supabase } from "./client-CrfNFjZ6.mjs";
import { $t as CircleCheckBig, Mt as Eye, Nt as EyeOff, en as CircleAlert, ht as LoaderCircle, s as Wheat } from "../_libs/lucide-react.mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Label } from "./label-BPuF5-mq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth.reset-password-CqDuslRF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ResetPasswordPage() {
	const navigate = useNavigate();
	const [ready, setReady] = (0, import_react.useState)(false);
	const [password, setPassword] = (0, import_react.useState)("");
	const [confirm, setConfirm] = (0, import_react.useState)("");
	const [show, setShow] = (0, import_react.useState)(false);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [msg, setMsg] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((event) => {
			if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
		});
		supabase.auth.getSession().then(({ data }) => {
			if (data.session) setReady(true);
		});
		return () => sub.subscription.unsubscribe();
	}, []);
	const submit = async (e) => {
		e.preventDefault();
		setMsg(null);
		if (password.length < 8) {
			setMsg({
				type: "error",
				text: "Password must be at least 8 characters."
			});
			return;
		}
		if (password !== confirm) {
			setMsg({
				type: "error",
				text: "Passwords do not match."
			});
			return;
		}
		setLoading(true);
		const { error } = await supabase.auth.updateUser({ password });
		setLoading(false);
		if (error) setMsg({
			type: "error",
			text: error.message
		});
		else {
			setMsg({
				type: "success",
				text: "Password updated! Redirecting…"
			});
			setTimeout(() => navigate({ to: "/auth" }), 900);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen flex items-center justify-center px-4 py-12",
		style: { background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)" },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/",
				className: "flex items-center justify-center gap-2 mb-6 text-gray-700 hover:text-[#00a63e]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "w-8 h-8 text-[#00a63e]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-2xl font-bold tracking-wide",
					children: "GrainHero"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "shadow-xl",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
					className: "text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
						className: "text-2xl",
						children: "Set a new password"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: ready ? "Choose a strong password for your account." : "Verifying reset link…" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: !ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex justify-center py-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-6 h-6 animate-spin text-[#00a63e]" })
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: submit,
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "rp-password",
								children: "New password"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "rp-password",
									type: show ? "text" : "password",
									value: password,
									onChange: (e) => setPassword(e.target.value),
									required: true,
									className: "pr-10"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setShow((s) => !s),
									className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700",
									children: show ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "w-4 h-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "w-4 h-4" })
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "rp-confirm",
								children: "Confirm password"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "rp-confirm",
								type: show ? "text" : "password",
								value: confirm,
								onChange: (e) => setConfirm(e.target.value),
								required: true
							})]
						}),
						msg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `flex items-start gap-2 text-sm border rounded-md p-3 ${msg.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`,
							children: [msg.type === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 mt-0.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "w-4 h-4 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: msg.text })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							disabled: loading,
							className: "w-full bg-[#00a63e] hover:bg-[#029238] text-white",
							children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : "Update password"
						})
					]
				}) })]
			})]
		})
	});
}
//#endregion
export { ResetPasswordPage as component };
