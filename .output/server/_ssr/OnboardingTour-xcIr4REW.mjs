import { o as __toESM } from "../_runtime.mjs";
import { l as require_react_dom, u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { R as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { t as supabase } from "./client-CrfNFjZ6.mjs";
import { $n as ArrowLeft, I as Sparkles, Qn as ArrowRight, ht as PartyPopper, n as X } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/OnboardingTour-xcIr4REW.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_react_dom = /* @__PURE__ */ __toESM(require_react_dom());
/**
* A game-style guided tour that plays the first time a signed-in user lands
* on the app (and can be replayed from Settings). Each step points to a real
* UI element via `data-tour="…"`, highlights it with a spotlight, and shows
* a friendly tooltip with next/back/skip controls.
* 
* Tour completion is stored per-user in Supabase profiles.preferences.onboarding_completed
*/
var STORAGE_KEY = "gh_onboarding_v1_done";
var RESTART_EVENT = "gh:restart-tour";
var STEPS = [
	{
		id: "welcome",
		title: "Welcome to GrainHero 👋",
		body: "Let's take a 60-second tour so you know where everything lives. You can skip anytime and replay it later from Settings.",
		placement: "center"
	},
	{
		id: "sidebar",
		title: "This is your control center",
		body: "Use the sidebar to jump between silos, batches, sensors, orders, and reports. Everything you manage lives here.",
		target: "[data-tour=\"sidebar\"]",
		placement: "right"
	},
	{
		id: "dashboard",
		title: "Live dashboard",
		body: "The dashboard shows real-time temperature, humidity, and alerts across all your silos. Green means safe, amber = watch, red = act now.",
		target: "[data-tour=\"nav-dashboard\"]",
		placement: "right"
	},
	{
		id: "orders",
		title: "Hardware & install orders",
		body: "Track your sensor purchase and technician visit here. When your install goes live, this is where you'll confirm it.",
		target: "[data-tour=\"nav-orders\"]",
		placement: "right"
	},
	{
		id: "notifications",
		title: "Alerts land here",
		body: "Spoilage warnings, subscription notices, and order updates pop into the bell — and we also email you when it's urgent.",
		target: "[data-tour=\"topbar-notifications\"]",
		placement: "bottom"
	},
	{
		id: "profile",
		title: "Your account & settings",
		body: "Click your avatar to update your profile, replay this tour, or manage your subscription.",
		target: "[data-tour=\"topbar-profile\"]",
		placement: "bottom"
	},
	{
		id: "done",
		title: "You're all set! 🎉",
		body: "That's the whirlwind tour. If you get stuck, hit the ❓ button on the sidebar to replay this or reach support.",
		placement: "center"
	}
];
/** Public helper — call to replay the tour from anywhere. */
async function restartOnboardingTour() {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(STORAGE_KEY);
	} catch {}
	try {
		const { data: { user } } = await supabase.auth.getUser();
		if (user) {
			const { data: profile } = await supabase.from("profiles").select("preferences").eq("id", user.id).single();
			const preferences = profile?.preferences || {};
			await supabase.from("profiles").update({ preferences: {
				...preferences,
				onboarding_completed: false
			} }).eq("id", user.id);
		}
	} catch (error) {
		console.error("Failed to reset onboarding in database:", error);
	}
	window.dispatchEvent(new Event(RESTART_EVENT));
}
function OnboardingTour() {
	const [active, setActive] = (0, import_react.useState)(false);
	const [stepIdx, setStepIdx] = (0, import_react.useState)(0);
	const [rect, setRect] = (0, import_react.useState)(null);
	const [userId, setUserId] = (0, import_react.useState)(null);
	const checkOnboardingStatus = (0, import_react.useCallback)(async () => {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return true;
			setUserId(user.id);
			const { data: profile, error } = await supabase.from("profiles").select("preferences").eq("id", user.id).single();
			if (error) {
				console.error("Error fetching profile:", error);
				try {
					return window.localStorage.getItem(STORAGE_KEY) === "1";
				} catch {
					return false;
				}
			}
			const preferences = profile?.preferences || {};
			if (preferences.onboarding_completed !== void 0) return preferences.onboarding_completed;
			try {
				if (window.localStorage.getItem(STORAGE_KEY) === "1") {
					await supabase.from("profiles").update({ preferences: {
						...preferences,
						onboarding_completed: true,
						onboarding_completed_at: (/* @__PURE__ */ new Date()).toISOString()
					} }).eq("id", user.id);
					return true;
				}
			} catch {}
			return false;
		} catch (error) {
			console.error("Error checking onboarding status:", error);
			try {
				return window.localStorage.getItem(STORAGE_KEY) === "1";
			} catch {
				return false;
			}
		}
	}, []);
	(0, import_react.useEffect)(() => {
		let mounted = true;
		checkOnboardingStatus().then((done) => {
			if (mounted && !done) {
				const t = setTimeout(() => {
					if (mounted) setActive(true);
				}, 450);
				return () => clearTimeout(t);
			}
		});
		const onRestart = () => {
			if (mounted) {
				setStepIdx(0);
				setActive(true);
			}
		};
		window.addEventListener(RESTART_EVENT, onRestart);
		return () => {
			mounted = false;
			window.removeEventListener(RESTART_EVENT, onRestart);
		};
	}, [checkOnboardingStatus]);
	const step = STEPS[stepIdx];
	const measure = (0, import_react.useCallback)(() => {
		if (!active || !step?.target) {
			setRect(null);
			return;
		}
		const el = document.querySelector(step.target);
		if (!el) {
			setRect(null);
			return;
		}
		el.scrollIntoView({
			block: "nearest",
			inline: "nearest",
			behavior: "smooth"
		});
		setRect(el.getBoundingClientRect());
	}, [active, step]);
	(0, import_react.useEffect)(() => {
		if (!active) return;
		measure();
		const raf = requestAnimationFrame(measure);
		window.addEventListener("resize", measure);
		window.addEventListener("scroll", measure, true);
		const interval = window.setInterval(measure, 500);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", measure);
			window.removeEventListener("scroll", measure, true);
			window.clearInterval(interval);
		};
	}, [active, measure]);
	const finish = (0, import_react.useCallback)(async () => {
		try {
			window.localStorage.setItem(STORAGE_KEY, "1");
		} catch {}
		if (userId) try {
			const { data: profile } = await supabase.from("profiles").select("preferences").eq("id", userId).single();
			const preferences = profile?.preferences || {};
			await supabase.from("profiles").update({ preferences: {
				...preferences,
				onboarding_completed: true,
				onboarding_completed_at: (/* @__PURE__ */ new Date()).toISOString()
			} }).eq("id", userId);
			console.log("✅ Onboarding tour completed and saved to database");
		} catch (error) {
			console.error("Failed to save onboarding completion to database:", error);
		}
		setActive(false);
	}, [userId]);
	const next = () => {
		if (stepIdx >= STEPS.length - 1) return finish();
		setStepIdx((i) => i + 1);
	};
	const back = () => setStepIdx((i) => Math.max(0, i - 1));
	const tooltipStyle = (0, import_react.useMemo)(() => {
		const pad = 14;
		if (!step) return { display: "none" };
		if (!rect || step.placement === "center") return {
			top: "50%",
			left: "50%",
			transform: "translate(-50%, -50%)"
		};
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const tipW = Math.min(340, vw - 24);
		const tipH = 200;
		let top = 0;
		let left = 0;
		switch (step.placement) {
			case "right":
				left = rect.right + pad;
				top = rect.top + rect.height / 2 - tipH / 2;
				break;
			case "left":
				left = rect.left - pad - tipW;
				top = rect.top + rect.height / 2 - tipH / 2;
				break;
			case "top":
				top = rect.top - pad - tipH;
				left = rect.left + rect.width / 2 - tipW / 2;
				break;
			default:
				top = rect.bottom + pad;
				left = rect.left + rect.width / 2 - tipW / 2;
				break;
		}
		left = Math.min(Math.max(12, left), vw - tipW - 12);
		top = Math.min(Math.max(12, top), vh - tipH - 12);
		return {
			top,
			left,
			width: tipW
		};
	}, [rect, step]);
	if (!active || !step) return null;
	if (typeof document === "undefined") return null;
	const isCentered = !rect || step.placement === "center";
	const progress = (stepIdx + 1) / STEPS.length * 100;
	return (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-[9999] pointer-events-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				className: "absolute inset-0 w-full h-full pointer-events-auto",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mask", {
					id: "gh-tour-mask",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						width: "100%",
						height: "100%",
						fill: "white"
					}), rect && !isCentered && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: rect.left - 8,
						y: rect.top - 8,
						width: rect.width + 16,
						height: rect.height + 16,
						rx: 12,
						ry: 12,
						fill: "black"
					})]
				}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					width: "100%",
					height: "100%",
					fill: "rgba(15, 23, 42, 0.62)",
					mask: "url(#gh-tour-mask)",
					style: { transition: "all 0.25s ease" }
				})]
			}),
			rect && !isCentered && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute pointer-events-none rounded-xl ring-2 ring-emerald-400 animate-pulse",
				style: {
					top: rect.top - 8,
					left: rect.left - 8,
					width: rect.width + 16,
					height: rect.height + 16,
					boxShadow: "0 0 0 4px rgba(16, 185, 129, 0.25)",
					transition: "all 0.25s ease"
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute pointer-events-auto animate-scale-in",
				style: tooltipStyle,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-w-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-1 bg-slate-100",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500 transition-all",
							style: { width: `${progress}%` }
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0",
										children: stepIdx === STEPS.length - 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PartyPopper, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex-1 min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-[11px] uppercase tracking-wide text-slate-500 font-semibold",
											children: [
												"Step ",
												stepIdx + 1,
												" of ",
												STEPS.length
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "font-semibold text-slate-900 leading-tight",
											children: step.title
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: finish,
										"aria-label": "Skip tour",
										className: "text-slate-400 hover:text-slate-700 transition p-1 -mr-1 -mt-1",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-slate-600 leading-relaxed",
								children: step.body
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between pt-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: finish,
									className: "text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2",
									children: "Skip tour"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [stepIdx > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										variant: "outline",
										onClick: back,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-3.5 w-3.5 mr-1" }), " Back"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										className: "bg-[#00a63e] hover:bg-[#029238] text-white",
										onClick: next,
										children: stepIdx === STEPS.length - 1 ? "Let's go" : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["Next ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-3.5 w-3.5 ml-1" })] })
									})]
								})]
							})
						]
					})]
				})
			})
		]
	}), document.body);
}
//#endregion
export { OnboardingTour, restartOnboardingTour };
