import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { t as supabase } from "./client-CrfNFjZ6.mjs";
import { Mt as Eye, Nt as EyeOff, Vt as Cpu, at as Package, ht as LoaderCircle } from "../_libs/lucide-react.mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as Label } from "./label-BPuF5-mq.mjs";
import { n as Message, t as AuthShell } from "./AuthShell-DLGMETs1.mjs";
import { sendWelcomeEmail } from "./email-automation.functions-eo8Q__me.mjs";
import { r as resolvePlanId, t as getCheckoutTotals } from "./pricing-data-BA_Y9Elr.mjs";
import { t as Route } from "./auth.signup-DJesjajj.mjs";
import { i as syncSignupToHubspot } from "./hubspot.functions-XOaLLP_6.mjs";
import { t as Separator } from "./separator-CUD9g08h.mjs";
import { r as getCheckoutSessionSummary } from "./stripe-checkout.functions-B_A1yuT4.mjs";
import { a as validateSignupForm, i as validatePassword, n as getPasswordStrengthText, t as getPasswordStrengthColor } from "./validation-EH5E_rXD.mjs";
import { t as autoConfirmUserEmail } from "./auth-verification-email.functions-DCIUaQUa.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth.signup-DmVNPrRi.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SignupOrderSummary({ planId, iotQuantity, paid = false }) {
	const totals = getCheckoutTotals(planId, iotQuantity);
	if (!totals) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 space-y-3 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-semibold uppercase tracking-wide text-emerald-800",
				children: paid ? "Your paid order" : "Order summary"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-2 min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-4 w-4 text-emerald-700 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-medium text-slate-900",
						children: [totals.plan.name, " plan"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-slate-600",
						children: "Monthly subscription"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "font-semibold text-slate-900 shrink-0",
					children: [
						"Rs. ",
						totals.monthlyPrice.toLocaleString(),
						"/mo"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-2 min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { className: "h-4 w-4 text-amber-700 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-medium text-slate-900",
						children: ["IoT sensors × ", totals.iotQuantity]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-slate-600",
						children: [
							"Rs. ",
							totals.iotUnit.toLocaleString(),
							" per sensor (one-time)"
						]
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "font-semibold text-slate-900 shrink-0",
					children: ["Rs. ", totals.iotTotal.toLocaleString()]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "bg-emerald-200" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-between items-center font-semibold text-slate-900",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: paid ? "Total paid" : "Total due today" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-base text-emerald-800",
					children: ["Rs. ", totals.dueToday.toLocaleString()]
				})]
			}),
			!paid && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-[11px] text-slate-500",
				children: [
					"Includes first month + sensor setup. Then Rs. ",
					totals.monthlyPrice.toLocaleString(),
					"/mo."
				]
			})
		]
	});
}
var PasswordStrengthIndicator = ({ strength, showFeedback = true }) => {
	const widthClasses = [
		"w-0",
		"w-1/4",
		"w-2/4",
		"w-3/4",
		"w-full"
	];
	const progressWidthClass = widthClasses[Math.max(0, Math.min(widthClasses.length - 1, Math.round(strength.score)))];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex-1 h-2 bg-gray-200 rounded-full overflow-hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `h-full transition-all duration-300 ${progressWidthClass} ${getPasswordStrengthColor(strength.score)}` })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-medium text-gray-600 min-w-[60px]",
					children: getPasswordStrengthText(strength.score)
				})]
			}),
			showFeedback && strength.feedback.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-1",
				children: strength.feedback.map((req, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 text-xs text-gray-600",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-1.5 h-1.5 rounded-full bg-gray-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: req })]
				}, i))
			}),
			strength.isValid && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-xs text-green-600",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-1.5 h-1.5 rounded-full bg-green-500" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Strong password!" })]
			})
		]
	});
};
var DRAFT_KEY = "grainhero.checkoutDraft.v1";
function parseSessionId(redirect) {
	if (!redirect?.includes("session_id=")) return null;
	try {
		const qs = redirect.includes("?") ? redirect.slice(redirect.indexOf("?")) : `?${redirect}`;
		return new URLSearchParams(qs).get("session_id");
	} catch {
		return null;
	}
}
function loadCheckoutDraft() {
	if (typeof window === "undefined") return {
		planId: null,
		iotQuantity: 1
	};
	try {
		const raw = window.localStorage.getItem(DRAFT_KEY);
		const draft = raw ? JSON.parse(raw) : null;
		const storedPlan = window.localStorage.getItem("selectedPlanId");
		return {
			planId: resolvePlanId(draft?.selected ?? storedPlan),
			iotQuantity: typeof draft?.iotQuantity === "number" ? draft.iotQuantity : 1
		};
	} catch {
		return {
			planId: null,
			iotQuantity: 1
		};
	}
}
function SignupPage() {
	const navigate = useNavigate();
	const { plan, email: prefillEmail, redirect } = Route.useSearch();
	const sessionId = (0, import_react.useMemo)(() => parseSessionId(redirect), [redirect]);
	const summaryFn = useServerFn(getCheckoutSessionSummary);
	const confirmEmailFn = useServerFn(autoConfirmUserEmail);
	const summaryQuery = useQuery({
		queryKey: ["signup-checkout-summary", sessionId],
		queryFn: () => summaryFn({ data: { sessionId } }),
		enabled: Boolean(sessionId)
	});
	const [draftPlan, setDraftPlan] = (0, import_react.useState)({
		planId: null,
		iotQuantity: 1
	});
	(0, import_react.useEffect)(() => {
		setDraftPlan(loadCheckoutDraft());
	}, []);
	const orderPlanId = (0, import_react.useMemo)(() => {
		if (summaryQuery.data?.planName) {
			const fromSummary = resolvePlanId(summaryQuery.data.planName);
			if (fromSummary) return fromSummary;
		}
		return resolvePlanId(plan) ?? draftPlan.planId;
	}, [
		summaryQuery.data?.planName,
		plan,
		draftPlan.planId
	]);
	const orderIotQuantity = (0, import_react.useMemo)(() => {
		const fromSummary = summaryQuery.data?.hardwareQuantity;
		if (typeof fromSummary === "number" && fromSummary > 0) return fromSummary;
		return draftPlan.iotQuantity;
	}, [summaryQuery.data?.hardwareQuantity, draftPlan.iotQuantity]);
	const showOrderSummary = Boolean(orderPlanId);
	const orderPaid = Boolean(summaryQuery.data?.paid);
	const [form, setForm] = (0, import_react.useState)({
		name: "",
		email: prefillEmail ?? "",
		phone: "",
		password: "",
		confirmPassword: ""
	});
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [msg, setMsg] = (0, import_react.useState)(null);
	const [strength, setStrength] = (0, import_react.useState)({
		score: 0,
		feedback: [],
		isValid: false
	});
	const [touched, setTouched] = (0, import_react.useState)({
		name: false,
		email: false,
		phone: false,
		password: false,
		confirmPassword: false
	});
	const [fieldErrors, setFieldErrors] = (0, import_react.useState)({
		name: "",
		email: "",
		phone: "",
		password: "",
		confirmPassword: ""
	});
	const update = (k, v) => {
		setForm((f) => ({
			...f,
			[k]: v
		}));
		if (k === "password") setStrength(validatePassword(v).strength);
		if (touched[k]) validateSingleField(k, v);
	};
	const validateSingleField = (field, value) => {
		const result = validateSignupForm({
			...form,
			[field]: value
		});
		setFieldErrors((prev) => ({
			...prev,
			[field]: result.errors[field] || ""
		}));
	};
	const handleBlur = (field) => {
		setTouched((prev) => ({
			...prev,
			[field]: true
		}));
		validateSingleField(field, form[field]);
	};
	const submit = async (e) => {
		e.preventDefault();
		setMsg(null);
		const { isValid, errors } = validateSignupForm(form);
		if (!isValid) {
			setMsg({
				type: "error",
				text: Object.values(errors)[0]
			});
			return;
		}
		setLoading(true);
		const safeRedirect = redirect?.startsWith("/") ? redirect : null;
		const normalizedEmail = form.email.trim().toLowerCase();
		const { data, error } = await supabase.auth.signUp({
			email: normalizedEmail,
			password: form.password,
			options: { data: {
				name: form.name.trim(),
				phone: form.phone.trim(),
				business_type: "farm"
			} }
		});
		if (error) {
			setMsg({
				type: "error",
				text: error.message
			});
			setLoading(false);
			return;
		}
		try {
			await confirmEmailFn({ data: { email: normalizedEmail } });
		} catch (e) {
			console.warn("[signup] auto-confirm failed (continuing):", e.message);
		}
		const { error: signInError } = await supabase.auth.signInWithPassword({
			email: normalizedEmail,
			password: form.password
		});
		setLoading(false);
		if (signInError) {
			setMsg({
				type: "error",
				text: `Account created but sign-in failed: ${signInError.message}`
			});
			return;
		}
		const [firstName, ...rest] = form.name.trim().split(/\s+/);
		sendWelcomeEmail().catch((e) => console.warn("[signup] welcome email failed:", e));
		syncSignupToHubspot({ data: {
			email: normalizedEmail,
			firstName,
			lastName: rest.join(" ") || void 0,
			phone: form.phone.trim() || void 0,
			company: form.name.trim()
		} }).catch((e) => console.warn("[signup] hubspot sync failed:", e));
		if (safeRedirect) navigate({ to: safeRedirect });
		else if (plan) navigate({
			to: "/checkout",
			search: { plan }
		});
		else navigate({ to: "/dashboard" });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold",
					children: "Create your account"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: orderPaid ? "Finish setup for your paid plan" : "Start monitoring your grain in minutes"
				})]
			}),
			showOrderSummary && orderPlanId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignupOrderSummary, {
				planId: orderPlanId,
				iotQuantity: orderIotQuantity,
				paid: orderPaid
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "su-name",
								children: "Full name"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "su-name",
								value: form.name,
								onChange: (e) => update("name", e.target.value),
								onBlur: () => handleBlur("name"),
								placeholder: "e.g., Ahmed Khan",
								required: true,
								className: touched.name && fieldErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""
							}),
							touched.name && fieldErrors.name && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-red-600",
								children: fieldErrors.name
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "su-email",
								children: "Email"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "su-email",
								type: "email",
								value: form.email,
								onChange: (e) => update("email", e.target.value),
								onBlur: () => handleBlur("email"),
								placeholder: "ahmed@grainstorage.pk",
								required: true,
								className: touched.email && fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""
							}),
							touched.email && fieldErrors.email && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-red-600",
								children: fieldErrors.email
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "su-phone",
								children: "Phone (optional)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "su-phone",
								value: form.phone,
								onChange: (e) => update("phone", e.target.value),
								onBlur: () => handleBlur("phone"),
								placeholder: "+92 300 1234567",
								className: touched.phone && fieldErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""
							}),
							touched.phone && fieldErrors.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-red-600",
								children: fieldErrors.phone
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "su-password",
								children: "Password"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "su-password",
									type: showPassword ? "text" : "password",
									value: form.password,
									onChange: (e) => update("password", e.target.value),
									onBlur: () => handleBlur("password"),
									required: true,
									className: `pr-10 ${touched.password && fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setShowPassword((s) => !s),
									className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700",
									children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "w-4 h-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "w-4 h-4" })
								})]
							}),
							form.password && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PasswordStrengthIndicator, { strength }),
							touched.password && fieldErrors.password && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-red-600",
								children: fieldErrors.password
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "su-confirm",
								children: "Confirm password"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "su-confirm",
								type: showPassword ? "text" : "password",
								value: form.confirmPassword,
								onChange: (e) => update("confirmPassword", e.target.value),
								onBlur: () => handleBlur("confirmPassword"),
								required: true,
								className: touched.confirmPassword && fieldErrors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""
							}),
							touched.confirmPassword && fieldErrors.confirmPassword && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-red-600",
								children: fieldErrors.confirmPassword
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Message, { msg }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: loading,
						className: "w-full bg-[#00a63e] hover:bg-[#029238] text-white",
						children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : "Create account"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-center text-muted-foreground",
				children: [
					"Already have an account?",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/auth/login",
						className: "text-[#00a63e] font-medium hover:underline",
						children: "Sign in"
					})
				]
			})
		]
	}) });
}
//#endregion
export { SignupPage as component };
