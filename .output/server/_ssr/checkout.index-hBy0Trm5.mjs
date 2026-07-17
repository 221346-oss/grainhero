import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { t as supabase } from "./client-CrfNFjZ6.mjs";
import { Bt as CreditCard, I as Shield, J as RefreshCw, Jt as Clock, M as Sparkles, Mt as Eye, Nt as EyeOff, Vt as Cpu, an as Check, at as Package, bn as ArrowRight, dt as MapPin, en as CircleAlert, f as User, ft as Mail, ht as LoaderCircle, xn as ArrowLeft } from "../_libs/lucide-react.mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-BPuF5-mq.mjs";
import { t as Textarea } from "./textarea-1llmCJsE.mjs";
import { n as pricingData, t as getCheckoutTotals } from "./pricing-data-BA_Y9Elr.mjs";
import { t as Separator } from "./separator-CUD9g08h.mjs";
import { n as createStripeCheckoutSession } from "./stripe-checkout.functions-B_A1yuT4.mjs";
import { r as validateEmail } from "./validation-EH5E_rXD.mjs";
import { t as Route } from "./checkout.index-DyKJurgB.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/checkout.index-hBy0Trm5.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Returns the signed-in user's onboarding progress so the post-payment welcome
* screen can guide them through the remaining steps (email confirmation,
* subscription activation, latest install order status).
*/
var getMyOnboardingStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("55bc33533dabdc2a2fe0081aaa5f75740b171876e872c010ca64af9a4859df10"));
var DRAFT_KEY = "grainhero.checkoutDraft.v1";
function loadDraft() {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(DRAFT_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
function CheckoutPage() {
	useNavigate();
	const { plan: initial, canceled } = Route.useSearch();
	const [selected, setSelected] = (0, import_react.useState)(initial ?? "intermediate");
	const [iotQuantity, setIotQuantity] = (0, import_react.useState)(1);
	const [authed, setAuthed] = (0, import_react.useState)(null);
	const [customerName, setCustomerName] = (0, import_react.useState)("");
	const [customerEmail, setCustomerEmail] = (0, import_react.useState)("");
	const [customerPassword, setCustomerPassword] = (0, import_react.useState)("");
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const [address, setAddress] = (0, import_react.useState)("");
	const [city, setCity] = (0, import_react.useState)("");
	const [country, setCountry] = (0, import_react.useState)("Pakistan");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [preferredDate, setPreferredDate] = (0, import_react.useState)("");
	const [notes, setNotes] = (0, import_react.useState)("");
	const [businessName, setBusinessName] = (0, import_react.useState)("");
	const [taxId, setTaxId] = (0, import_react.useState)("");
	const draftLoaded = (0, import_react.useRef)(false);
	const [errors, setErrors] = (0, import_react.useState)({});
	const [touched, setTouched] = (0, import_react.useState)({});
	(0, import_react.useEffect)(() => {
		supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
	}, []);
	const normalizePhone = (value) => value.trim();
	const isPhoneValid = (value) => {
		const n = value.trim();
		if (!n.startsWith("+")) return false;
		const d = n.slice(1).replace(/[\s\-\(\)]/g, "");
		return /^\d+$/.test(d) && d.length >= 7 && d.length <= 15;
	};
	const isNameValid = (value) => {
		const parts = value.trim().split(/\s+/).filter((p) => p.length > 0);
		return parts.length >= 2 && parts.every((p) => p.length >= 2);
	};
	const validateField = (field, value) => {
		let result;
		switch (field) {
			case "customerName":
				if (!value.trim()) result = {
					isValid: false,
					message: "Full name is required"
				};
				else if (!isNameValid(value)) if (value.trim().split(/\s+/).filter((p) => p.length > 0).length < 2) result = {
					isValid: false,
					message: "Please enter first and last name"
				};
				else result = {
					isValid: false,
					message: "Each name part must be at least 2 characters"
				};
				else result = {
					isValid: true,
					message: ""
				};
				break;
			case "customerEmail":
				result = validateEmail(value);
				break;
			case "phone": {
				const normalized = normalizePhone(value);
				if (!normalized) result = {
					isValid: false,
					message: "Phone number is required"
				};
				else if (!normalized.startsWith("+")) result = {
					isValid: false,
					message: "Must start with + and country code e.g. +1, +44, +92"
				};
				else {
					const digits = normalized.slice(1).replace(/[\s\-\(\)]/g, "");
					if (!/^\d+$/.test(digits) || digits.length < 7 || digits.length > 15) result = {
						isValid: false,
						message: "Enter a valid phone number e.g. +92 300 1234567"
					};
					else result = {
						isValid: true,
						message: ""
					};
				}
				break;
			}
			case "address":
				result = !value.trim() || value.trim().length < 3 ? {
					isValid: false,
					message: "Address must be at least 3 characters"
				} : {
					isValid: true,
					message: ""
				};
				break;
			case "city":
				result = !value.trim() ? {
					isValid: false,
					message: "City is required"
				} : {
					isValid: true,
					message: ""
				};
				break;
			case "country":
				result = !value.trim() ? {
					isValid: false,
					message: "Country is required"
				} : {
					isValid: true,
					message: ""
				};
				break;
			default: result = {
				isValid: true,
				message: ""
			};
		}
		setErrors((prev) => ({
			...prev,
			[field]: result.message
		}));
		return result.isValid;
	};
	const handleBlur = (field) => {
		setTouched((prev) => ({
			...prev,
			[field]: true
		}));
	};
	(0, import_react.useEffect)(() => {
		if (draftLoaded.current) return;
		draftLoaded.current = true;
		const d = loadDraft();
		if (!d) return;
		const storedPlan = (() => {
			try {
				return window.localStorage.getItem("selectedPlanId");
			} catch {
				return null;
			}
		})();
		if (!initial && d.selected) setSelected(d.selected);
		else if (!initial && (storedPlan === "basic" || storedPlan === "intermediate" || storedPlan === "pro")) setSelected(storedPlan);
		if (typeof d.iotQuantity === "number") setIotQuantity(d.iotQuantity);
		if (d.customerName) setCustomerName(d.customerName);
		if (d.customerEmail) setCustomerEmail(d.customerEmail);
		if (d.customerPassword) setCustomerPassword(d.customerPassword);
		if (d.address) setAddress(d.address);
		if (d.city) setCity(d.city);
		if (d.country) setCountry(d.country);
		if (d.phone) setPhone(d.phone);
		if (d.preferredDate) setPreferredDate(d.preferredDate);
		if (d.notes) setNotes(d.notes);
		if (d.businessName) setBusinessName(d.businessName);
		if (d.taxId) setTaxId(d.taxId);
		if (d.address || d.phone) toast("↩️ Restored your previous checkout details");
	}, [initial]);
	(0, import_react.useEffect)(() => {
		if (typeof window === "undefined") return;
		const draft = {
			selected,
			iotQuantity,
			customerName,
			customerEmail,
			customerPassword,
			address,
			city,
			country,
			phone,
			preferredDate,
			notes,
			businessName,
			taxId
		};
		try {
			window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
		} catch {}
	}, [
		selected,
		iotQuantity,
		customerName,
		customerEmail,
		customerPassword,
		address,
		city,
		country,
		phone,
		preferredDate,
		notes,
		businessName,
		taxId
	]);
	(0, import_react.useEffect)(() => {
		if (canceled) toast("Checkout canceled. You can pick a plan and try again.");
	}, [canceled]);
	const statusFn = useServerFn(getMyOnboardingStatus);
	const pending = useQuery({
		queryKey: ["checkout-onboarding-status"],
		queryFn: () => statusFn(),
		enabled: authed === true
	}).data?.pendingOrders ?? [];
	const startFn = useServerFn(createStripeCheckoutSession);
	const start = useMutation({
		mutationFn: () => startFn({ data: {
			planId: selected,
			iotQuantity,
			customer: {
				name: customerName.trim(),
				email: customerEmail.trim().toLowerCase()
			},
			install: {
				address: address.trim(),
				city: city.trim(),
				country: country.trim(),
				phone: normalizePhone(phone).trim(),
				preferredDate: preferredDate || null,
				notes: notes.trim() || null,
				businessName: businessName.trim() || null,
				taxId: taxId.trim() || null
			}
		} }),
		onSuccess: ({ url }) => {
			window.location.href = url;
		},
		onError: (e) => toast.error(e.message ?? "Could not start checkout")
	});
	const canPay = iotQuantity >= 1 && isNameValid(customerName) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) && customerPassword.length >= 8 && address.trim().length > 2 && country.trim().length > 0 && isPhoneValid(phone);
	const planData = pricingData.find((p) => p.id === selected);
	const checkoutTotals = planData ? getCheckoutTotals(selected, iotQuantity) : null;
	const [step, setStep] = (0, import_react.useState)(0);
	const stepMeta = [
		{
			n: 1,
			label: "Plan",
			icon: Package
		},
		{
			n: 2,
			label: "Buyer",
			icon: User
		},
		{
			n: 3,
			label: "Install",
			icon: MapPin
		},
		{
			n: 4,
			label: "Review & Pay",
			icon: CreditCard
		}
	];
	const stepValid = [
		!!selected && iotQuantity >= 1,
		isNameValid(customerName) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) && customerPassword.length >= 8,
		address.trim().length > 2 && country.trim().length > 0 && isPhoneValid(phone),
		canPay
	];
	const missingReasons = [];
	if (iotQuantity < 1) missingReasons.push("Add at least 1 IoT sensor");
	if (!isNameValid(customerName)) missingReasons.push("Enter your full name (first + last, 2+ chars each)");
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) missingReasons.push("Enter a valid email");
	if (customerPassword.length < 8) missingReasons.push("Password must be at least 8 characters");
	if (address.trim().length <= 2) missingReasons.push("Enter your install address");
	if (!country.trim()) missingReasons.push("Enter your country");
	if (!isPhoneValid(phone)) missingReasons.push("Enter a valid phone with country code, e.g. +92 300 1234567");
	const goNext = () => {
		if (!stepValid[step]) {
			if (step === 1) {
				setTouched((prev) => ({
					...prev,
					customerName: true,
					customerEmail: true
				}));
				validateField("customerName", customerName);
				validateField("customerEmail", customerEmail);
			} else if (step === 2) {
				setTouched((prev) => ({
					...prev,
					address: true,
					city: true,
					country: true,
					phone: true
				}));
				validateField("address", address);
				validateField("city", city);
				validateField("country", country);
				validateField("phone", phone);
			}
			toast.error("Please fix the errors above to continue.");
			return;
		}
		setStep((s) => Math.min(3, s + 1));
		if (typeof window !== "undefined") window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	const goBack = () => setStep((s) => Math.max(0, s - 1));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen py-10 px-4",
		style: { background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)" },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-5xl mx-auto space-y-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/",
						className: "text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" }), " Back to home"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/auth/login",
						className: "text-sm text-slate-600 hover:text-slate-900",
						children: "Already have an account? Sign in"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3.5 w-3.5" }), " Set up in under 3 minutes"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-3 text-3xl md:text-4xl font-bold text-slate-900",
							children: stepMeta[step].label
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-slate-600 mt-2",
							children: [
								"Step ",
								step + 1,
								" of 4 — ",
								step === 3 ? "review and pay securely" : "we'll create your account after payment",
								"."
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-white/70 bg-white/70 backdrop-blur p-3 shadow-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-4 gap-2",
						children: stepMeta.map((s, i) => {
							const Icon = s.icon;
							const done = i < step;
							const active = i === step;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									if (i < step || stepValid.slice(0, i).every(Boolean)) setStep(i);
								},
								className: `flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition ${active ? "bg-emerald-600 text-white shadow" : done ? "bg-emerald-100 text-emerald-800" : "text-slate-500 hover:bg-slate-100"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-white text-emerald-600" : done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"} text-xs font-bold`,
									children: done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3.5 w-3.5" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] font-semibold leading-tight",
									children: s.label
								})]
							}, s.label);
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all",
							style: { width: `${(step + 1) / 4 * 100}%` }
						})
					})]
				}),
				canceled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					className: "border-amber-300 bg-amber-50",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex items-start gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "h-5 w-5 text-amber-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium text-amber-900",
								children: "Payment was canceled"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-amber-800",
								children: "No charges yet — your details are saved and you can try again below."
							})]
						})]
					})
				}),
				authed && pending.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					className: "border-emerald-300 bg-emerald-50",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex items-start gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-5 w-5 text-emerald-700 shrink-0 mt-0.5" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium text-emerald-900",
									children: "Resume your previous checkout"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-emerald-800",
									children: [
										"We saved your ",
										pending[0].plan_name ?? pending[0].plan_id ?? "plan",
										" order",
										typeof pending[0].hardware_quantity === "number" ? ` with ${pending[0].hardware_quantity} sensor(s)` : "",
										". Pick up right where you left off."
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "outline",
								className: "border-emerald-600 text-emerald-700 hover:bg-emerald-100",
								onClick: () => {
									const p = pending[0];
									if (p.plan_id === "basic" || p.plan_id === "intermediate" || p.plan_id === "pro") setSelected(p.plan_id);
									if (typeof p.hardware_quantity === "number") setIotQuantity(p.hardware_quantity);
								},
								children: "Resume"
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-6 lg:grid-cols-[1fr_320px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-6",
						children: [
							step === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid gap-4 md:grid-cols-3",
									children: pricingData.map((p) => {
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
											onClick: () => setSelected(p.id),
											className: `cursor-pointer transition ${p.id === selected ? "border-emerald-500 ring-2 ring-emerald-200 shadow-lg scale-[1.01]" : "hover:border-slate-300 hover:shadow-md"}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-start justify-between",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
														className: "text-lg",
														children: p.name
													}), p.popular && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														className: "bg-emerald-600",
														children: "Popular"
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, {
													className: "text-xs",
													children: p.description
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "pt-2",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-2xl font-bold text-slate-900",
														children: p.priceFrontend
													})
												})
											] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
												className: "space-y-1.5 text-xs",
												children: p.features.slice(0, 5).map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
													className: "flex items-start gap-2 text-slate-700",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" }), f]
												}, f))
											}) })]
										}, p.id);
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
									className: "text-base flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { className: "h-4 w-4 text-amber-600" }), " IoT sensor setup"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
									"Rs. ",
									(planData?.iotCharge ?? 7e3).toLocaleString(),
									" per sensor · our technician installs on-site"
								] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											variant: "outline",
											size: "sm",
											onClick: () => setIotQuantity(Math.max(1, iotQuantity - 1)),
											children: "−"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											min: 1,
											max: 50,
											value: iotQuantity,
											onChange: (e) => setIotQuantity(Math.max(1, Math.min(50, Number(e.target.value) || 1))),
											className: "w-20 h-9 px-2 rounded border border-slate-200 text-sm text-center"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											variant: "outline",
											size: "sm",
											onClick: () => setIotQuantity(Math.min(50, iotQuantity + 1)),
											children: "+"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-xs text-slate-500",
											children: ["= Rs. ", (checkoutTotals?.iotTotal ?? iotQuantity * 7e3).toLocaleString()]
										})
									]
								}) })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
									className: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-sky-50",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
										className: "p-6",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex justify-between text-sm",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-slate-600",
														children: "Monthly subscription"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-medium",
														children: [
															"Rs. ",
															planData?.price.toLocaleString(),
															"/mo"
														]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex justify-between text-sm",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-slate-600",
														children: "IoT setup (one-time)"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-medium",
														children: ["Rs. ", (iotQuantity * 7e3).toLocaleString()]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "bg-slate-300" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex justify-between items-baseline",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-base font-semibold text-slate-900",
														children: "Total due today"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "text-right",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "text-2xl font-bold text-emerald-700",
															children: ["Rs. ", ((planData?.price ?? 0) + iotQuantity * 7e3).toLocaleString()]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "text-xs text-slate-500 mt-0.5",
															children: [
																"Then Rs. ",
																planData?.price.toLocaleString(),
																"/month"
															]
														})]
													})]
												})
											]
										})
									})
								})
							] }),
							step === 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
								className: "text-base flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-4 w-4 text-emerald-600" }), " Buyer details"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Your account will be created with this email after payment." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-4 md:grid-cols-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "customer-name",
											children: "Full name *"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "customer-name",
											value: customerName,
											onChange: (e) => {
												setCustomerName(e.target.value);
												if (touched.customerName) validateField("customerName", e.target.value);
											},
											onBlur: () => {
												handleBlur("customerName");
												validateField("customerName", customerName);
											},
											placeholder: "e.g., Ahmed Khan",
											maxLength: 160,
											className: touched.customerName && errors.customerName ? "border-red-500 focus-visible:ring-red-500" : ""
										}),
										touched.customerName && errors.customerName && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-red-600 mt-1",
											children: errors.customerName
										})
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "customer-email",
											children: "Email *"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "relative",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												id: "customer-email",
												type: "email",
												value: customerEmail,
												onChange: (e) => {
													setCustomerEmail(e.target.value);
													if (touched.customerEmail) validateField("customerEmail", e.target.value);
												},
												onBlur: () => {
													handleBlur("customerEmail");
													validateField("customerEmail", customerEmail);
												},
												placeholder: "ahmed@grainstorage.pk",
												className: `pl-9 ${touched.customerEmail && errors.customerEmail ? "border-red-500 focus-visible:ring-red-500" : ""}`,
												maxLength: 180
											})]
										}),
										touched.customerEmail && errors.customerEmail && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-red-600 mt-1",
											children: errors.customerEmail
										})
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "md:col-span-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
												htmlFor: "customer-password",
												children: ["Password * ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-400 font-normal text-xs",
													children: "(min. 8 characters)"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "relative",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
													id: "customer-password",
													type: showPassword ? "text" : "password",
													value: customerPassword,
													onChange: (e) => setCustomerPassword(e.target.value),
													placeholder: "Create a password for your account",
													className: "pr-10",
													maxLength: 128
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => setShowPassword((s) => !s),
													className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600",
													children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
												})]
											}),
											customerPassword.length > 0 && customerPassword.length < 8 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs text-red-500 mt-1",
												children: "Password must be at least 8 characters"
											})
										]
									})
								]
							}) })] }),
							step === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
								className: "text-base flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-4 w-4 text-emerald-600" }), " Install details"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Where our technician should install and how to reach you." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-4 md:grid-cols-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "md:col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "addr",
											children: "Office address *"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "addr",
											value: address,
											onChange: (e) => setAddress(e.target.value),
											placeholder: "Street, area, landmark",
											maxLength: 300
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "country",
											children: "Country *"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "country",
											value: country,
											onChange: (e) => {
												setCountry(e.target.value);
												if (touched.country) validateField("country", e.target.value);
											},
											onBlur: () => {
												handleBlur("country");
												validateField("country", country);
											},
											maxLength: 120,
											className: touched.country && errors.country ? "border-red-500 focus-visible:ring-red-500" : ""
										}),
										touched.country && errors.country && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-red-600 mt-1",
											children: errors.country
										})
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "phone",
											children: "Contact phone *"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "phone",
											value: phone,
											onChange: (e) => {
												setPhone(e.target.value);
												if (touched.phone) validateField("phone", e.target.value);
											},
											onBlur: () => {
												handleBlur("phone");
												validateField("phone", phone);
											},
											placeholder: "+92 300 1234567 / +1 555 0000",
											maxLength: 40,
											className: touched.phone && errors.phone ? "border-red-500 focus-visible:ring-red-500" : ""
										}),
										touched.phone && errors.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-red-600 mt-1",
											children: errors.phone
										})
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "date",
										children: "Preferred install date"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "date",
										type: "date",
										value: preferredDate,
										onChange: (e) => setPreferredDate(e.target.value)
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "biz",
										children: "Business name (invoicing)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "biz",
										value: businessName,
										onChange: (e) => setBusinessName(e.target.value),
										placeholder: "e.g., Khan Grain Storage Pvt. Ltd.",
										maxLength: 200
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "md:col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "notes",
											children: "Notes for the technician"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
											id: "notes",
											rows: 3,
											value: notes,
											onChange: (e) => setNotes(e.target.value),
											maxLength: 1e3,
											placeholder: "e.g., 3 warehouses, 12 silos total, access via back gate, need 2-day advance notice"
										})]
									})
								]
							}) })] }),
							step === 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
								className: "border-emerald-200",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
									className: "text-base flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 text-emerald-600" }), " Review your order"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Confirm everything looks right before we hand you to Stripe." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
									className: "space-y-3 text-sm",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-lg bg-emerald-50 p-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs uppercase tracking-wide text-emerald-700 font-semibold mb-1",
												children: "Plan"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "font-medium text-slate-900",
												children: [
													planData?.name,
													" — ",
													planData?.priceFrontend
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-lg bg-slate-50 p-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1",
													children: "Buyer"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-slate-900",
													children: customerName
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-slate-600 text-xs",
													children: customerEmail
												}),
												businessName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-slate-600 text-xs mt-0.5",
													children: ["Business: ", businessName]
												}),
												taxId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-slate-600 text-xs",
													children: ["GST / Tax ID: ", taxId]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-lg bg-slate-50 p-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs uppercase tracking-wide text-slate-500 font-semibold",
													children: "Install site"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-slate-900",
													children: [
														address,
														", ",
														country
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-slate-600 text-xs",
													children: [
														"Phone: ",
														phone,
														preferredDate ? ` · Preferred: ${preferredDate}` : ""
													]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-lg bg-amber-50 p-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs uppercase tracking-wide text-amber-700 font-semibold",
												children: "IoT setup"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-slate-900",
												children: [
													iotQuantity,
													" sensor(s) × Rs. ",
													(checkoutTotals?.iotUnit ?? 7e3).toLocaleString(),
													" = Rs. ",
													(checkoutTotals?.iotTotal ?? iotQuantity * 7e3).toLocaleString()
												]
											})]
										}),
										notes.trim() && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-lg bg-slate-50 p-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs uppercase tracking-wide text-slate-500 font-semibold",
												children: "Notes for technician"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-slate-900 text-sm mt-1 whitespace-pre-wrap",
												children: notes.trim()
											})]
										}),
										checkoutTotals && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-lg border border-emerald-300 bg-white p-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex justify-between text-sm",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-slate-600",
														children: "Plan (first month)"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-medium",
														children: ["Rs. ", checkoutTotals.monthlyPrice.toLocaleString()]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex justify-between text-sm mt-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-slate-600",
														children: "Sensor setup"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-medium",
														children: ["Rs. ", checkoutTotals.iotTotal.toLocaleString()]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "my-2" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex justify-between font-semibold text-slate-900",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total due today" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-emerald-700",
														children: ["Rs. ", checkoutTotals.dueToday.toLocaleString()]
													})]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											className: "w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white text-base font-semibold shadow-md",
											disabled: start.isPending || !canPay,
											onClick: () => start.mutate(),
											children: start.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin mr-2" }), " Redirecting to Stripe…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4 mr-2" }), " Pay securely with Stripe"] })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[11px] text-slate-500 text-center",
											children: "You'll be redirected to Stripe's secure checkout. No charges until you confirm."
										}),
										!canPay && missingReasons.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "font-semibold mb-1",
												children: "Complete these to enable payment:"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
												className: "list-disc pl-4 space-y-0.5",
												children: missingReasons.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: r }, r))
											})]
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "button",
									variant: "ghost",
									onClick: goBack,
									disabled: step === 0,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4 mr-1" }), " Back"]
								}), step < 3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "button",
									onClick: goNext,
									className: "bg-emerald-600 hover:bg-emerald-700 text-white",
									children: ["Continue ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4 ml-1" })]
								}) : null]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
						className: "lg:sticky lg:top-6 h-fit",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "border-white/70 bg-white/80 backdrop-blur shadow-md",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
								className: "text-base",
								children: "Order summary"
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
								className: "space-y-3",
								children: checkoutTotals && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-slate-600",
											children: [checkoutTotals.plan.name, " (1st month)"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-medium",
											children: ["Rs. ", checkoutTotals.monthlyPrice.toLocaleString()]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-slate-600",
											children: ["IoT sensors × ", checkoutTotals.iotQuantity]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-medium",
											children: ["Rs. ", checkoutTotals.iotTotal.toLocaleString()]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-sm font-semibold",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total due today" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-emerald-700",
											children: ["Rs. ", checkoutTotals.dueToday.toLocaleString()]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-xs text-slate-500",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Then monthly" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											"Rs. ",
											checkoutTotals.monthlyPrice.toLocaleString(),
											"/mo"
										] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
										className: "space-y-1.5 text-xs text-slate-600",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-3.5 w-3.5 text-emerald-600" }), " Secure Stripe checkout"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3.5 w-3.5 text-emerald-600" }), " Technician visit after payment"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreditCard, { className: "h-3.5 w-3.5 text-emerald-600" }), " Cancel anytime"]
											})
										]
									})
								] })
							})]
						})
					})]
				})
			]
		})
	});
}
//#endregion
export { CheckoutPage as component };
