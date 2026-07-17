import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { t as supabase } from "./client-CrfNFjZ6.mjs";
import { J as RefreshCw, R as ShieldCheck, ht as LoaderCircle } from "../_libs/lucide-react.mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { n as Message, t as AuthShell } from "./AuthShell-DLGMETs1.mjs";
import { t as Route } from "./auth.verify-otp-C19cON2e.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth.verify-otp-BK9d379n.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function VerifyOtpPage() {
	const navigate = useNavigate();
	const { email } = Route.useSearch();
	const [otp, setOtp] = (0, import_react.useState)([
		"",
		"",
		"",
		"",
		"",
		""
	]);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [resending, setResending] = (0, import_react.useState)(false);
	const [msg, setMsg] = (0, import_react.useState)(null);
	const inputRefs = (0, import_react.useRef)([]);
	const handleChange = (index, value) => {
		const digit = value.replace(/\D/g, "").slice(-1);
		const next = [...otp];
		next[index] = digit;
		setOtp(next);
		if (digit && index < 5) inputRefs.current[index + 1]?.focus();
	};
	const handleKeyDown = (index, e) => {
		if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
	};
	const handlePaste = (e) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
		if (!pasted) return;
		const next = Array(6).fill("");
		for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
		setOtp(next);
		inputRefs.current[Math.min(pasted.length, 5)]?.focus();
	};
	const submit = async (e) => {
		e.preventDefault();
		const token = otp.join("");
		if (token.length < 6) {
			setMsg({
				type: "error",
				text: "Enter the full 6-digit code."
			});
			return;
		}
		setMsg(null);
		setLoading(true);
		const { error } = await supabase.auth.verifyOtp({
			email,
			token,
			type: "email"
		});
		setLoading(false);
		if (error) {
			setMsg({
				type: "error",
				text: error.message
			});
			return;
		}
		setMsg({
			type: "success",
			text: "Verified! Taking you to dashboard…"
		});
		setTimeout(() => navigate({
			to: "/dashboard",
			replace: true
		}), 500);
	};
	const resend = async () => {
		setResending(true);
		setMsg(null);
		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: { shouldCreateUser: false }
		});
		setResending(false);
		if (error) setMsg({
			type: "error",
			text: error.message
		});
		else {
			setOtp([
				"",
				"",
				"",
				"",
				"",
				""
			]);
			inputRefs.current[0]?.focus();
			setMsg({
				type: "success",
				text: "New code sent — check your inbox."
			});
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-6 w-6 text-emerald-600" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl font-semibold",
						children: "Check your email"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted-foreground",
						children: [
							"We sent a 6-digit code to",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium text-slate-900",
								children: email
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted-foreground",
						children: [
							"Check spam if not in inbox — sender is",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium",
								children: "noreply@mail.app.supabase.io"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "space-y-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-2 justify-center",
						onPaste: handlePaste,
						children: otp.map((digit, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							ref: (el) => {
								inputRefs.current[i] = el;
							},
							type: "text",
							inputMode: "numeric",
							maxLength: 1,
							value: digit,
							onChange: (e) => handleChange(i, e.target.value),
							onKeyDown: (e) => handleKeyDown(i, e),
							className: "w-11 h-12 text-center text-xl font-bold",
							autoFocus: i === 0
						}, i))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Message, { msg }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: loading,
						className: "w-full bg-[#00a63e] hover:bg-[#029238] text-white",
						children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : "Verify & go to dashboard"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: resend,
					disabled: resending,
					className: "text-sm text-[#00a63e] hover:underline inline-flex items-center gap-1.5 disabled:opacity-50",
					children: [resending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "w-3 h-3" }), "Resend code"]
				})
			})
		]
	}) });
}
//#endregion
export { VerifyOtpPage as component };
