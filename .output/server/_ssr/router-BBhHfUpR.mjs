import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-CrfNFjZ6.mjs";
import { c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, j as redirect, l as useRouterState, m as createFileRoute, p as lazyRouteComponent, s as Scripts, v as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as PageSkeleton } from "./skeletons-BBw01c0Z.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { r as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { n as writeFirebaseControl } from "./actuator-bridge.server-C-vFaxOB.mjs";
import { t as Route$60 } from "./auth.login-BWrYCeNK.mjs";
import { t as Route$61 } from "./auth.signup-DJesjajj.mjs";
import { t as Route$62 } from "./auth.verify-otp-C19cON2e.mjs";
import { t as Route$63 } from "./checkout.index-DyKJurgB.mjs";
import { t as Route$64 } from "./checkout.success-BRLziX57.mjs";
import processModule from "node:process";
import path from "node:path";
import fs from "node:fs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-BBhHfUpR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-DiJuwhen.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$59 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "GrainHero — AI-Powered Grain Storage Management" },
			{
				name: "description",
				content: "Monitor, predict, and optimize your grain storage with GrainHero's intelligent SaaS platform."
			},
			{
				property: "og:title",
				content: "GrainHero — AI-Powered Grain Storage Management"
			},
			{
				property: "og:description",
				content: "Monitor, predict, and optimize your grain storage with GrainHero's intelligent SaaS platform."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:title",
				content: "GrainHero — AI-Powered Grain Storage Management"
			},
			{
				name: "twitter:description",
				content: "Monitor, predict, and optimize your grain storage with GrainHero's intelligent SaaS platform."
			},
			{
				property: "og:image",
				content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/103a216c-3714-4c93-a116-dfad0356f524/id-preview-e07050d2--08a93ae3-e513-4d21-8fb9-bf6979e71541.lovable.app-1783459228294.png"
			},
			{
				name: "twitter:image",
				content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/103a216c-3714-4c93-a116-dfad0356f524/id-preview-e07050d2--08a93ae3-e513-4d21-8fb9-bf6979e71541.lovable.app-1783459228294.png"
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}, {
			rel: "icon",
			href: "/favicon.ico",
			type: "image/x-icon"
		}]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$59.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
	});
}
var $$splitComponentImporter$50 = () => import("./terms-C7iwpt9a.mjs");
var Route$58 = createFileRoute("/terms")({
	head: () => ({ meta: [{ title: "Terms of Service — GrainHero" }, {
		name: "description",
		content: "GrainHero Terms of Service. Read our terms and conditions for using the platform."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$50, "component")
});
var $$splitComponentImporter$49 = () => import("./team-DkgPmv_I.mjs");
var Route$57 = createFileRoute("/team")({
	head: () => ({ meta: [{ title: "Our Team — GrainHero" }, {
		name: "description",
		content: "Meet the founders and team behind GrainHero's innovative grain storage solutions."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$49, "component")
});
var BASE_URL = "https://frfgmbgzildtfchtmchr.lovable.app";
var Route$56 = createFileRoute("/sitemap.xml")({ server: { handlers: { GET: async () => {
	const xml = [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
		...[{
			path: "/",
			changefreq: "weekly",
			priority: "1.0"
		}].map((entry) => [
			`  <url>`,
			`    <loc>${BASE_URL}${entry.path}</loc>`,
			entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
			entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
			entry.priority ? `    <priority>${entry.priority}</priority>` : null,
			`  </url>`
		].filter(Boolean).join("\n")),
		`</urlset>`
	].join("\n");
	return new Response(xml, { headers: {
		"Content-Type": "application/xml",
		"Cache-Control": "public, max-age=3600"
	} });
} } } });
var $$splitComponentImporter$48 = () => import("./privacy-DFuVoAUo.mjs");
var Route$55 = createFileRoute("/privacy")({
	head: () => ({ meta: [{ title: "Privacy Policy — GrainHero" }, {
		name: "description",
		content: "GrainHero Privacy Policy. Learn how we collect, use, and protect your personal information."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$48, "component")
});
var $$splitComponentImporter$47 = () => import("./help-DTv2IhEL.mjs");
var Route$54 = createFileRoute("/help")({
	head: () => ({ meta: [{ title: "Help Center — GrainHero" }, {
		name: "description",
		content: "Get help and support for GrainHero. Find answers, tutorials, and contact our support team."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$47, "component")
});
var $$splitComponentImporter$46 = () => import("./docs-DE-6bmKI.mjs");
var Route$53 = createFileRoute("/docs")({
	head: () => ({ meta: [{ title: "Documentation — GrainHero" }, {
		name: "description",
		content: "Complete technical documentation for GrainHero platform, API references, and integration guides."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$46, "component")
});
var $$splitComponentImporter$45 = () => import("./contact-j4lo3QnZ.mjs");
var Route$52 = createFileRoute("/contact")({
	head: () => ({ meta: [{ title: "Contact Us — GrainHero" }, {
		name: "description",
		content: "Get in touch with GrainHero. We're here to help with any questions about our grain storage monitoring platform."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$45, "component")
});
var $$splitComponentImporter$44 = () => import("./checkout-BzVZZdJi.mjs");
var Route$51 = createFileRoute("/checkout")({ component: lazyRouteComponent($$splitComponentImporter$44, "component") });
var $$splitComponentImporter$43 = () => import("./blog-ERe_-mmc.mjs");
var Route$50 = createFileRoute("/blog")({
	head: () => ({ meta: [{ title: "Blog — GrainHero" }, {
		name: "description",
		content: "Stay updated with the latest news, tips, and insights about grain storage technology and agriculture."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$43, "component")
});
var $$splitComponentImporter$42 = () => import("./auth-CGwJ9iLr.mjs");
var Route$49 = createFileRoute("/auth")({
	beforeLoad: ({ location }) => {
		if (location.pathname === "/auth" || location.pathname === "/auth/") throw redirect({ to: "/auth/login" });
	},
	component: lazyRouteComponent($$splitComponentImporter$42, "component")
});
var $$splitComponentImporter$41 = () => import("./about-BOKLu6kc.mjs");
var Route$48 = createFileRoute("/about")({
	head: () => ({ meta: [{ title: "About Us — GrainHero" }, {
		name: "description",
		content: "Learn about GrainHero's mission to revolutionize grain storage with AI-powered technology."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$41, "component")
});
var $$splitComponentImporter$40 = () => import("./route-0sz9Yx91.mjs");
var Route$47 = createFileRoute("/_authenticated")({
	ssr: false,
	beforeLoad: async ({ location }) => {
		const { data, error } = await supabase.auth.getUser();
		if (error || !data.user) throw redirect({ to: "/auth/login" });
		const OPERATIONAL_PREFIXES = [
			"/silos",
			"/warehouses",
			"/grain-batches",
			"/sensors",
			"/actuators"
		];
		const SUPER_ADMIN_REDIRECTS = {
			"/team-management": "/platform/users",
			"/data-visualization": "/analytics",
			"/traceability": "/dashboard",
			"/orders": "/platform/orders"
		};
		const path = location.pathname;
		if (OPERATIONAL_PREFIXES.some((p) => path.startsWith(p)) || Object.keys(SUPER_ADMIN_REDIRECTS).some((p) => path === p || path.startsWith(p + "/"))) {
			const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
			const rs = (roles ?? []).map((r) => r.role);
			const isSuperAdmin = rs.includes("super_admin");
			const alsoOperational = rs.some((r) => [
				"admin",
				"manager",
				"technician"
			].includes(r));
			if (isSuperAdmin && !alsoOperational) {
				if (OPERATIONAL_PREFIXES.some((p) => path.startsWith(p))) throw redirect({ to: "/not-allowed" });
				for (const [from, to] of Object.entries(SUPER_ADMIN_REDIRECTS)) if (path === from || path.startsWith(from + "/")) throw redirect({ to });
			}
		}
		return { user: data.user };
	},
	component: lazyRouteComponent($$splitComponentImporter$40, "component")
});
var $$splitComponentImporter$39 = () => import("./routes-C2Xp4bH2.mjs");
var Route$46 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "GrainHero — AI-Powered Grain Storage Management" },
		{
			name: "description",
			content: "Monitor, predict, and optimize your grain storage with GrainHero's intelligent SaaS platform. AI-powered spoilage prediction, IoT sensors, and real-time analytics."
		},
		{
			property: "og:title",
			content: "GrainHero — Smart Grain Storage, Powered by AI"
		},
		{
			property: "og:description",
			content: "AI-powered grain storage management platform with real-time monitoring and predictive analytics."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$39, "component")
});
var $$splitComponentImporter$38 = () => import("./auth.reset-password-CqDuslRF.mjs");
var Route$45 = createFileRoute("/auth/reset-password")({
	head: () => ({ meta: [{ title: "Set a new password — GrainHero" }] }),
	component: lazyRouteComponent($$splitComponentImporter$38, "component")
});
var $$splitComponentImporter$37 = () => import("./auth.forgot-password-bAedYkdF.mjs");
var Route$44 = createFileRoute("/auth/forgot-password")({
	head: () => ({ meta: [{ title: "Reset password — GrainHero" }] }),
	component: lazyRouteComponent($$splitComponentImporter$37, "component")
});
var $$splitComponentImporter$36 = () => import("./warehouses-ODd8pACO.mjs");
var Route$43 = createFileRoute("/_authenticated/warehouses")({ component: lazyRouteComponent($$splitComponentImporter$36, "component") });
var $$splitComponentImporter$35 = () => import("./traceability-DCvYxGKq.mjs");
var Route$42 = createFileRoute("/_authenticated/traceability")({ component: lazyRouteComponent($$splitComponentImporter$35, "component") });
var $$splitComponentImporter$34 = () => import("./team-management-DLBgrqmd.mjs");
var Route$41 = createFileRoute("/_authenticated/team-management")({ component: lazyRouteComponent($$splitComponentImporter$34, "component") });
var $$splitComponentImporter$33 = () => import("./subscription-DGrmLfnx.mjs");
var Route$40 = createFileRoute("/_authenticated/subscription")({ component: lazyRouteComponent($$splitComponentImporter$33, "component") });
var $$splitComponentImporter$32 = () => import("./silos-DrNOXciA.mjs");
var Route$39 = createFileRoute("/_authenticated/silos")({ component: lazyRouteComponent($$splitComponentImporter$32, "component") });
var $$splitComponentImporter$31 = () => import("./settings-DNniE1Hq.mjs");
var Route$38 = createFileRoute("/_authenticated/settings")({ component: lazyRouteComponent($$splitComponentImporter$31, "component") });
var $$splitComponentImporter$30 = () => import("./server-monitoring-C5oKZhPY.mjs");
var Route$37 = createFileRoute("/_authenticated/server-monitoring")({ component: lazyRouteComponent($$splitComponentImporter$30, "component") });
var $$splitComponentImporter$29 = () => import("./sensors-BsuiM_VB.mjs");
var Route$36 = createFileRoute("/_authenticated/sensors")({ component: lazyRouteComponent($$splitComponentImporter$29, "component") });
var $$splitComponentImporter$28 = () => import("./security-center-TChcDTIQ.mjs");
var Route$35 = createFileRoute("/_authenticated/security-center")({ component: lazyRouteComponent($$splitComponentImporter$28, "component") });
var $$splitComponentImporter$27 = () => import("./revenue-SgoUVESI.mjs");
var Route$34 = createFileRoute("/_authenticated/revenue")({ component: lazyRouteComponent($$splitComponentImporter$27, "component") });
var $$splitComponentImporter$26 = () => import("./reports-ZsAT9FCA.mjs");
var Route$33 = createFileRoute("/_authenticated/reports")({ component: lazyRouteComponent($$splitComponentImporter$26, "component") });
var $$splitComponentImporter$25 = () => import("./plans-BfJK1XJv.mjs");
var Route$32 = createFileRoute("/_authenticated/plans")({ component: lazyRouteComponent($$splitComponentImporter$25, "component") });
var $$splitComponentImporter$24 = () => import("./orders-Cg0I_eBf.mjs");
var Route$31 = createFileRoute("/_authenticated/orders")({
	head: () => ({ meta: [{ title: "My install orders — GrainHero" }] }),
	component: lazyRouteComponent($$splitComponentImporter$24, "component")
});
var $$splitComponentImporter$23 = () => import("./notifications-Dt8HUB-e.mjs");
var Route$30 = createFileRoute("/_authenticated/notifications")({ component: lazyRouteComponent($$splitComponentImporter$23, "component") });
var $$splitComponentImporter$22 = () => import("./not-allowed-D_fo-47M.mjs");
var Route$29 = createFileRoute("/_authenticated/not-allowed")({ component: lazyRouteComponent($$splitComponentImporter$22, "component") });
var $$splitComponentImporter$21 = () => import("./ml-models-O-hKuwog.mjs");
var Route$28 = createFileRoute("/_authenticated/ml-models")({ component: lazyRouteComponent($$splitComponentImporter$21, "component") });
var $$splitComponentImporter$20 = () => import("./maintenance-3IGg-hgS.mjs");
var Route$27 = createFileRoute("/_authenticated/maintenance")({ component: lazyRouteComponent($$splitComponentImporter$20, "component") });
var $$splitComponentImporter$19 = () => import("./insurance-B4NHboso.mjs");
var Route$26 = createFileRoute("/_authenticated/insurance")({ component: lazyRouteComponent($$splitComponentImporter$19, "component") });
var $$splitComponentImporter$18 = () => import("./incidents-llCvzjkK.mjs");
var Route$25 = createFileRoute("/_authenticated/incidents")({ component: lazyRouteComponent($$splitComponentImporter$18, "component") });
var $$splitComponentImporter$17 = () => import("./grain-batches-Dy1B0aSR.mjs");
var Route$24 = createFileRoute("/_authenticated/grain-batches")({ component: lazyRouteComponent($$splitComponentImporter$17, "component") });
var $$splitComponentImporter$16 = () => import("./grain-alerts-CrGctzaY.mjs");
var Route$23 = createFileRoute("/_authenticated/grain-alerts")({ component: lazyRouteComponent($$splitComponentImporter$16, "component") });
var $$splitComponentImporter$15 = () => import("./environmental-DQ5RnmgJ.mjs");
var Route$22 = createFileRoute("/_authenticated/environmental")({ component: lazyRouteComponent($$splitComponentImporter$15, "component") });
var $$splitComponentImporter$14 = () => import("./data-visualization-BOB2yprV.mjs");
var Route$21 = createFileRoute("/_authenticated/data-visualization")({ component: lazyRouteComponent($$splitComponentImporter$14, "component") });
var $$splitComponentImporter$13 = () => import("./dashboard-BoxfCEbr.mjs");
var Route$20 = createFileRoute("/_authenticated/dashboard")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
var $$splitComponentImporter$12 = () => import("./buyers-DIJa-rPr.mjs");
var Route$19 = createFileRoute("/_authenticated/buyers")({ component: lazyRouteComponent($$splitComponentImporter$12, "component") });
var $$splitComponentImporter$11 = () => import("./analytics-D-xux8VR.mjs");
var Route$18 = createFileRoute("/_authenticated/analytics")({ component: lazyRouteComponent($$splitComponentImporter$11, "component") });
var $$splitComponentImporter$10 = () => import("./ai-predictions-CV2dNql3.mjs");
var Route$17 = createFileRoute("/_authenticated/ai-predictions")({ component: lazyRouteComponent($$splitComponentImporter$10, "component") });
var $$splitComponentImporter$9 = () => import("./actuators-BkboHBOP.mjs");
var Route$16 = createFileRoute("/_authenticated/actuators")({ component: lazyRouteComponent($$splitComponentImporter$9, "component") });
var $$splitComponentImporter$8 = () => import("./activity-logs-D5Zj6u3d.mjs");
var Route$15 = createFileRoute("/_authenticated/activity-logs")({ component: lazyRouteComponent($$splitComponentImporter$8, "component") });
/**
* GET /api/firebase/live-sensors
*
* Replaces GH1 dashboard.js GET /api/firebase/live-sensors handler (line 1872).
* Consumed by:
*   - GH2 frontend_code/hooks/useFirebaseSensor.ts
*   - GH1 frontend farmHomeFrontend-main/hooks/useFirebaseSensor.ts
*
* Returns the same JSON shape GH1 returned:
*   { success: true, devices: { [deviceId]: { temperature, humidity, tvoc_ppb, timestamp } } }
*
* Auth: requires valid Supabase session cookie (same as all authenticated routes).
*/
var Route$14 = createFileRoute("/api/firebase/live-sensors")({ server: { handlers: { GET: async ({ request }) => {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
	if (!token) return new Response(JSON.stringify({
		success: false,
		error: "Unauthorized"
	}), {
		status: 401,
		headers: { "content-type": "application/json" }
	});
	const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
	if (authErr || !user) return new Response(JSON.stringify({
		success: false,
		error: "Unauthorized"
	}), {
		status: 401,
		headers: { "content-type": "application/json" }
	});
	try {
		const { fetchAllDevicePayloads } = await import("./actuator-bridge.server-C-vFaxOB.mjs").then((n) => n.r);
		const snap = await fetchAllDevicePayloads();
		const devices = {};
		for (const [deviceId, payload] of Object.entries(snap)) {
			const p = payload;
			let ts = p.ts ?? p.timestamp ?? p.timestamp_unix ?? null;
			if (typeof ts === "number" && ts < 2e9) ts = ts * 1e3;
			devices[deviceId] = {
				temperature: typeof p.temperature === "number" ? p.temperature : null,
				humidity: typeof p.humidity === "number" ? p.humidity : null,
				tvoc_ppb: typeof p.tvoc_ppb === "number" ? p.tvoc_ppb : typeof p.voc === "number" ? p.voc : null,
				timestamp: ts !== null ? new Date(ts).toISOString() : null
			};
		}
		return new Response(JSON.stringify({
			success: true,
			devices
		}), { headers: { "content-type": "application/json" } });
	} catch (err) {
		console.error("[live-sensors] Firebase read error:", err);
		return new Response(JSON.stringify({
			success: false,
			devices: {},
			error: err.message
		}), {
			status: 502,
			headers: { "content-type": "application/json" }
		});
	}
} } } });
var $$splitComponentImporter$7 = () => import("./platform.users-CYHejMwe.mjs");
var Route$13 = createFileRoute("/_authenticated/platform/users")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
var $$splitComponentImporter$6 = () => import("./platform.tenants-CP_G83MH.mjs");
var Route$12 = createFileRoute("/_authenticated/platform/tenants")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./platform.pipeline-D96vdNI1.mjs");
var Route$11 = createFileRoute("/_authenticated/platform/pipeline")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
var $$splitComponentImporter$4 = () => import("./platform.orders-BYZu6-yh.mjs");
var Route$10 = createFileRoute("/_authenticated/platform/orders")({
	head: () => ({ meta: [{ title: "Install orders — Platform" }] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./platform.logs-C0Re1kTI.mjs");
var Route$9 = createFileRoute("/_authenticated/platform/logs")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./platform.leads-SA2krNar.mjs");
var Route$8 = createFileRoute("/_authenticated/platform/leads")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./platform.health-Ey7rK6g7.mjs");
var Route$7 = createFileRoute("/_authenticated/platform/health")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./platform.audit-logs-bVIRFx3A.mjs");
var Route$6 = createFileRoute("/_authenticated/platform/audit-logs")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
/**
* Stripe webhook. Verifies the signature with STRIPE_WEBHOOK_SECRET,
* then upserts subscription state and logs security_events.
* URL: /api/public/webhooks/stripe
*/
var Route$5 = createFileRoute("/api/public/webhooks/stripe")({ server: { handlers: { POST: async ({ request }) => {
	const secret = processModule.env.STRIPE_WEBHOOK_SECRET;
	if (!secret) return new Response("webhook secret not configured", { status: 500 });
	const sigHeader = request.headers.get("stripe-signature");
	if (!sigHeader) return new Response("missing signature", { status: 400 });
	const rawBody = await request.text();
	const parts = Object.fromEntries(sigHeader.split(",").map((kv) => {
		const [k, ...rest] = kv.split("=");
		return [k, rest.join("=")];
	}));
	const t = parts["t"];
	const v1 = parts["v1"];
	if (!t || !v1) return new Response("bad signature", { status: 400 });
	const skew = Math.abs(Math.floor(Date.now() / 1e3) - Number(t));
	if (!Number.isFinite(skew) || skew > 300) return new Response("signature expired", { status: 400 });
	const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {
		name: "HMAC",
		hash: "SHA-256"
	}, false, ["sign"]);
	const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`));
	const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
	if (expected.length !== v1.length) return new Response("bad signature", { status: 400 });
	let diff = 0;
	for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
	if (diff !== 0) return new Response("bad signature", { status: 400 });
	const event = JSON.parse(rawBody);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { sendCheckoutConfirmationEmail } = await import("./checkout-emails.functions-BjkdsGHa.mjs");
	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const s = event.data.object;
				const userId = s.metadata?.user_id ?? null;
				const planId = s.metadata?.plan_id ?? null;
				const hardwareOrderId = s.metadata?.hardware_order_id ?? s.client_reference_id ?? null;
				const sessionId = s.id ?? null;
				if (sessionId) try {
					await sendCheckoutConfirmationEmail({ data: { sessionId } });
				} catch (e) {
					console.warn("[stripe-webhook] confirm email failed:", e.message);
				}
				if (userId && s.customer) await supabaseAdmin.from("profiles").update({ stripe_customer_id: s.customer }).eq("id", userId);
				if (userId) {
					await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
					await supabaseAdmin.from("user_roles").insert({
						user_id: userId,
						role: "admin"
					});
					await supabaseAdmin.from("profiles").update({ admin_id: userId }).eq("id", userId);
				}
				if (userId) await supabaseAdmin.from("security_events").insert({
					user_id: userId,
					tenant_id: userId,
					event: "billing.checkout_completed",
					meta: {
						plan_id: planId,
						subscription: s.subscription ?? null
					}
				});
				if (hardwareOrderId) {
					await supabaseAdmin.from("hardware_orders").update({
						status: "new",
						stripe_customer_id: s.customer ?? null,
						stripe_subscription_id: s.subscription ?? null,
						stripe_payment_intent: s.payment_intent ?? null
					}).eq("id", hardwareOrderId);
					const { data: supers } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "super_admin");
					const superIds = (supers ?? []).map((r) => r.user_id);
					if (superIds.length > 0) await supabaseAdmin.from("notifications").insert(superIds.map((uid) => ({
						user_id: uid,
						tenant_id: uid,
						type: "order.new",
						subject: "New install order placed",
						body: `A new install order was placed for plan ${planId ?? "?"}. Order id: ${hardwareOrderId}`,
						is_read: false
					})));
					try {
						const gatewayKey = processModule.env.LOVABLE_API_KEY;
						const resendKey = processModule.env.RESEND_API_KEY;
						const to = processModule.env.SUPPORT_EMAIL;
						const configFrom = processModule.env.RESEND_FROM_EMAIL || "GrainHero <onboarding@resend.dev>";
						if (resendKey && to) {
							const { data: order } = await supabaseAdmin.from("hardware_orders").select("id,plan_name,hardware_quantity,hardware_total,install_address,install_city,install_country,contact_phone,preferred_install_date,notes").eq("id", hardwareOrderId).maybeSingle();
							const o = order ?? {};
							const subject = `New install order — ${o.plan_name ?? planId ?? "GrainHero"}`;
							const html = `<h2>New install order</h2>
<p><b>Order:</b> ${o.id ?? hardwareOrderId}</p>
<p><b>Plan:</b> ${o.plan_name ?? planId ?? "-"}</p>
<p><b>Hardware units:</b> ${o.hardware_quantity ?? 0} × Rs. 7,000 = Rs. ${Number(o.hardware_total ?? 0).toLocaleString()}</p>
<p><b>Install address:</b><br/>${o.install_address ?? "-"}<br/>${o.install_city ?? ""}, ${o.install_country ?? ""}</p>
<p><b>Contact phone:</b> ${o.contact_phone ?? "-"}</p>
<p><b>Preferred date:</b> ${o.preferred_install_date ?? "-"}</p>
<p><b>Notes:</b> ${o.notes ?? "-"}</p>
<p>Open the Platform → Orders console to assign a technician.</p>`;
							const trySendWebhookEmail = async (fromAddress) => {
								if (gatewayKey) try {
									if ((await fetch("https://connector-gateway.lovable.dev/resend/emails", {
										method: "POST",
										headers: {
											"Content-Type": "application/json",
											Authorization: `Bearer ${gatewayKey}`,
											"X-Connection-Api-Key": resendKey
										},
										body: JSON.stringify({
											from: fromAddress,
											to: [to],
											subject,
											html
										})
									})).ok) return true;
								} catch (e) {
									console.warn("[webhook email] gateway send failed:", e);
								}
								try {
									return (await fetch("https://api.resend.com/emails", {
										method: "POST",
										headers: {
											"Content-Type": "application/json",
											Authorization: `Bearer ${resendKey}`
										},
										body: JSON.stringify({
											from: fromAddress,
											to: [to],
											subject,
											html
										})
									})).ok;
								} catch (e) {
									console.warn("[webhook email] direct send failed:", e);
									return false;
								}
							};
							if (!await trySendWebhookEmail(configFrom) && !configFrom.includes("resend.dev")) {
								console.log("[webhook email] Retrying with sandbox onboarding@resend.dev sender");
								await trySendWebhookEmail("GrainHero <onboarding@resend.dev>");
							}
						}
					} catch (e) {
						console.warn("[order email] error:", e);
					}
				}
				break;
			}
			case "customer.subscription.created":
			case "customer.subscription.updated": {
				const sub = event.data.object;
				const { data: prof } = await supabaseAdmin.from("profiles").select("id").eq("stripe_customer_id", sub.customer).maybeSingle();
				const adminId = prof?.id ?? sub.metadata?.user_id ?? null;
				const hardwareOrderId = sub.metadata?.hardware_order_id ?? null;
				if (hardwareOrderId) await supabaseAdmin.from("hardware_orders").update({
					stripe_subscription_id: sub.id,
					stripe_customer_id: sub.customer
				}).eq("id", hardwareOrderId);
				if (!adminId) break;
				const price = sub.items?.data[0]?.price;
				const planId = sub.metadata?.plan_id ?? "";
				const planNameMap = {
					basic: "Grain Starter",
					intermediate: "Grain Professional",
					pro: "Grain Enterprise"
				};
				const planLimits = {
					basic: {
						users: 5,
						devices: 3,
						storage: 10,
						batches: 100
					},
					intermediate: {
						users: 10,
						devices: 6,
						storage: 50,
						batches: 500
					},
					pro: {
						users: 999999,
						devices: 15,
						storage: 999999,
						batches: 999999
					}
				};
				const limits = planLimits[planId] ?? planLimits.basic;
				const status = (/* @__PURE__ */ new Set([
					"active",
					"inactive",
					"cancelled",
					"expired",
					"trial"
				])).has(sub.status) ? sub.status : "active";
				const interval = price?.recurring?.interval ?? "month";
				const billingCycle = interval === "year" ? "yearly" : interval === "quarter" ? "quarterly" : "monthly";
				if (adminId) {
					await supabaseAdmin.from("user_roles").delete().eq("user_id", adminId);
					await supabaseAdmin.from("user_roles").insert({
						user_id: adminId,
						role: "admin"
					});
					await supabaseAdmin.from("profiles").update({ admin_id: adminId }).eq("id", adminId);
				}
				await supabaseAdmin.from("subscriptions").upsert({
					admin_id: adminId,
					plan_name: planNameMap[planId] ?? "Custom",
					plan_description: `Stripe subscription (${planId})`,
					status,
					auto_renew: !(sub.cancel_at_period_end ?? false),
					start_date: (/* @__PURE__ */ new Date()).toISOString(),
					end_date: sub.current_period_end ? (/* @__PURE__ */ new Date(sub.current_period_end * 1e3)).toISOString() : new Date(Date.now() + 720 * 60 * 60 * 1e3).toISOString(),
					next_payment_date: sub.current_period_end ? (/* @__PURE__ */ new Date(sub.current_period_end * 1e3)).toISOString() : null,
					price_per_month: price ? Number(price.unit_amount) / 100 : 0,
					currency: (price?.currency ?? "usd").toUpperCase(),
					billing_cycle: billingCycle,
					stripe_subscription_id: sub.id,
					stripe_customer_id: sub.customer,
					max_users: limits.users,
					max_devices: limits.devices,
					max_storage_gb: limits.storage,
					max_batches: limits.batches
				}, { onConflict: "stripe_subscription_id" });
				await supabaseAdmin.from("security_events").insert({
					user_id: adminId,
					tenant_id: adminId,
					event: `billing.${event.type}`,
					meta: { status: sub.status }
				});
				break;
			}
			case "customer.subscription.deleted": {
				const sub = event.data.object;
				await supabaseAdmin.from("subscriptions").update({
					status: "cancelled",
					auto_renew: false,
					cancellation_date: (/* @__PURE__ */ new Date()).toISOString()
				}).eq("stripe_subscription_id", sub.id);
				try {
					const { notifyPlatformEvent } = await import("./platform-notify.server-D3yHIDtc.mjs");
					const { data: subRow } = await supabaseAdmin.from("subscriptions").select("customer_id, plan_name").eq("stripe_subscription_id", sub.id).maybeSingle();
					await notifyPlatformEvent({
						type: "churn",
						customerId: subRow?.customer_id ?? sub.id,
						plan: subRow?.plan_name ?? null
					});
				} catch {}
				break;
			}
			case "invoice.payment_failed":
			case "invoice.paid": {
				const inv = event.data.object;
				const { data: prof } = await supabaseAdmin.from("profiles").select("id").eq("stripe_customer_id", inv.customer ?? "").maybeSingle();
				if (prof?.id) await supabaseAdmin.from("security_events").insert({
					user_id: prof.id,
					tenant_id: prof.id,
					event: `billing.${event.type}`,
					meta: {
						amount: inv.amount_paid,
						currency: inv.currency
					}
				});
				if (event.type === "invoice.payment_failed") try {
					const { notifyPlatformEvent } = await import("./platform-notify.server-D3yHIDtc.mjs");
					await notifyPlatformEvent({
						type: "stripe_payment_failed",
						customerId: inv.customer ?? "unknown",
						amount: inv.amount_paid,
						currency: inv.currency
					});
				} catch {}
				break;
			}
			default: break;
		}
	} catch (err) {
		console.error("[stripe-webhook] handler error:", err);
		return new Response("handler error", { status: 500 });
	}
	return new Response("ok");
} } } });
var Route$4 = createFileRoute("/api/public/hooks/sensor-offline-detector")({ server: { handlers: { POST: async () => {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const cutoff = (/* @__PURE__ */ new Date(Date.now() - 300 * 1e3)).toISOString();
	const { data: stale, error: findErr } = await supabaseAdmin.from("sensor_devices").select("id, admin_id, device_id, device_name, silo_id, warehouse_id").eq("status", "active").lt("last_heartbeat", cutoff);
	if (findErr) {
		console.error("sensor-offline find error:", findErr);
		return new Response(JSON.stringify({
			ok: false,
			error: findErr.message
		}), {
			status: 500,
			headers: { "content-type": "application/json" }
		});
	}
	const staleIds = (stale ?? []).map((s) => s.id);
	let updated = 0;
	let alertsCreated = 0;
	if (staleIds.length > 0) {
		const { error: upErr } = await supabaseAdmin.from("sensor_devices").update({
			status: "offline",
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		}).in("id", staleIds);
		if (upErr) console.error("sensor-offline update error:", upErr);
		else updated = staleIds.length;
		const rows = (stale ?? []).map((s) => ({
			alert_id: `SENSOR-OFFLINE-${s.id}-${Date.now()}`,
			admin_id: s.admin_id,
			device_id: s.id,
			silo_id: s.silo_id,
			warehouse_id: s.warehouse_id,
			alert_type: "system",
			priority: "high",
			source: "sensor-offline-detector",
			title: `Sensor ${s.device_name ?? s.device_id} offline`,
			message: `Device ${s.device_id} has not sent a heartbeat in over 5 minutes`,
			status: "pending"
		}));
		if (rows.length > 0) {
			const { error: insErr } = await supabaseAdmin.from("grain_alerts").insert(rows);
			if (insErr) console.error("sensor-offline alert insert error:", insErr);
			else alertsCreated = rows.length;
		}
	}
	return new Response(JSON.stringify({
		ok: true,
		offlined: updated,
		alertsCreated,
		at: (/* @__PURE__ */ new Date()).toISOString()
	}), { headers: { "content-type": "application/json" } });
} } } });
var Route$3 = createFileRoute("/api/public/hooks/expiry-reminders")({ server: { handlers: { POST: async ({ request }) => {
	const auth = request.headers.get("apikey") || request.headers.get("authorization")?.replace("Bearer ", "");
	const expected = processModule.env.SUPABASE_PUBLISHABLE_KEY || processModule.env.SUPABASE_ANON_KEY;
	if (!auth || !expected || auth !== expected) return new Response("Unauthorized", { status: 401 });
	const { runExpiryReminders } = await import("./expiry-reminders.server-P06qe0Fy.mjs");
	try {
		const result = await runExpiryReminders();
		return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
	} catch (e) {
		return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
			status: 500,
			headers: { "Content-Type": "application/json" }
		});
	}
} } } });
var Route$2 = createFileRoute("/api/public/hooks/alerts-escalation")({ server: { handlers: { POST: async () => {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const cutoff = (/* @__PURE__ */ new Date(Date.now() - 1800 * 1e3)).toISOString();
	const { data, error } = await supabaseAdmin.from("grain_alerts").update({
		status: "escalated",
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).in("status", ["pending", "acknowledged"]).lt("created_at", cutoff).select("id");
	if (error) {
		console.error("alerts-escalation error:", error);
		return new Response(JSON.stringify({
			ok: false,
			error: error.message
		}), {
			status: 500,
			headers: { "content-type": "application/json" }
		});
	}
	return new Response(JSON.stringify({
		ok: true,
		escalated: data?.length ?? 0,
		at: (/* @__PURE__ */ new Date()).toISOString()
	}), { headers: { "content-type": "application/json" } });
} } } });
function appendToMLDataset(data) {
	try {
		const csvDir = path.resolve(processModule.cwd(), "src/ml");
		if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true });
		const csvPath = path.resolve(csvDir, "rice_spoilage_10k.csv");
		const t = data.temperature;
		const rh = data.humidity;
		const calcDewPoint = (t, rh) => {
			const a = 17.27, b = 237.7;
			const alpha = a * t / (b + t) + Math.log(rh / 100 + 1e-9);
			return Math.round(b * alpha / (a - alpha) * 100) / 100;
		};
		const dpVal = calcDewPoint(t, rh);
		const rainfallVal = 0;
		let dangerCount = 0;
		if (data.moisture > 18) dangerCount += 2;
		else if (data.moisture > 14) dangerCount += 1;
		if (t > 35) dangerCount += 2;
		else if (t > 25) dangerCount += 1;
		if (rh > 80) dangerCount += 2;
		else if (rh > 65) dangerCount += 1;
		if (data.storageDays > 365) dangerCount += 2;
		else if (data.storageDays > 180) dangerCount += 1;
		if (data.pestScore > .5) dangerCount += 1;
		const spoilageClass = dangerCount >= 5 ? 2 : dangerCount >= 2 ? 1 : 0;
		const spoilageLabel = spoilageClass === 2 ? "Spoiled" : spoilageClass === 1 ? "Risky" : "Safe";
		const grainTypeEncoded = data.grainType.toLowerCase() === "rice" ? 1 : data.grainType.toLowerCase() === "wheat" ? 2 : 1;
		const row = [
			t.toFixed(2),
			rh.toFixed(2),
			data.storageDays,
			spoilageLabel,
			grainTypeEncoded,
			data.airflow.toFixed(3),
			dpVal.toFixed(2),
			data.light.toFixed(1),
			data.pestScore > .5 ? 1 : 0,
			data.moisture.toFixed(2),
			rainfallVal.toFixed(1)
		].join(",") + "\n";
		fs.appendFileSync(csvPath, row);
		console.log(`[ML Logger] 📊 Appended reading to training dataset (label=${spoilageLabel})`);
	} catch (err) {
		console.warn(`[ML Logger] CSV append warning:`, err.message);
	}
}
/**
* Cron endpoint: call every N minutes to pull sensor data from Firebase RTDB
* and persist a sensor_readings row per device.
* Auth: caller must send `apikey: <SUPABASE_PUBLISHABLE_KEY>` header.
*
* PATH COMPATIBILITY:
*   GH2 path (new firmware): /devices/{deviceId}/live
*   GH1 path (legacy ESP32):  /sensor_data/{deviceId}/latest
*   Both trees are read and merged so no firmware update is required.
*/
var Route$1 = createFileRoute("/api/public/cron/sync-firebase")({ server: { handlers: { POST: async ({ request }) => {
	const anonKey = processModule.env.SUPABASE_PUBLISHABLE_KEY;
	if (!anonKey) return new Response("SUPABASE_PUBLISHABLE_KEY missing", { status: 500 });
	if ((request.headers.get("apikey") ?? "") !== anonKey) return new Response("Unauthorized", { status: 401 });
	const { fetchAllDevicePayloads } = await import("./actuator-bridge.server-C-vFaxOB.mjs").then((n) => n.r);
	let snap;
	try {
		snap = await fetchAllDevicePayloads();
	} catch (e) {
		return new Response(`Firebase error: ${e.message}`, { status: 502 });
	}
	const deviceIds = Object.keys(snap ?? {});
	if (deviceIds.length === 0) return Response.json({ synced: 0 });
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { autoRegisterDevice } = await import("./auto-register.server-ITjP9oWH.mjs");
	const { data: knownDevices } = await supabaseAdmin.from("sensor_devices").select("id, device_id, silo_id, warehouse_id, admin_id");
	const deviceMap = /* @__PURE__ */ new Map();
	for (const d of knownDevices ?? []) deviceMap.set(d.device_id, d);
	for (const firebaseDeviceId of deviceIds) if (!deviceMap.has(firebaseDeviceId)) {
		const registered = await autoRegisterDevice(firebaseDeviceId);
		if (registered) deviceMap.set(registered.device_id, registered);
	}
	const devices = Array.from(deviceMap.values());
	const { data: batches } = await supabaseAdmin.from("grain_batches").select("id, silo_id, grain_type, intake_date").is("deleted_at", null);
	const activeBatchMap = /* @__PURE__ */ new Map();
	for (const b of batches ?? []) if (b.silo_id) activeBatchMap.set(b.silo_id, b);
	const { runPythonMLInference } = await import("./ai-inference.functions-DKIuZxSn.mjs");
	let synced = 0;
	const now = /* @__PURE__ */ new Date();
	for (const dev of devices) {
		const live = snap?.[dev.device_id];
		if (!live) continue;
		const g = (k1, k2) => {
			if (typeof live[k1] === "number") return live[k1];
			if (k2 && typeof live[k2] === "number") return live[k2];
			return null;
		};
		const temp = g("temperature");
		const hum = g("humidity");
		const voc = g("voc", "tvoc_ppb");
		const co2 = g("co2");
		const ambientLight = g("light", "light_pct");
		const soilMoisture = g("soil_moisture_pct");
		let moist = g("moisture");
		if (moist === null && soilMoisture !== null) moist = Math.round((25 - soilMoisture / 100 * 17) * 10) / 10;
		const pwmSpeedVal = g("pwm_speed", "pwm") ?? 0;
		const airflowVal = pwmSpeedVal / 100;
		const servoState = live.servo_state === 1 || live.lid_state === 1 ? 1 : 0;
		const fanState = live.fan_state === 1 || pwmSpeedVal > 0 ? 1 : 0;
		let pestScore = 0;
		if (voc !== null) {
			if (voc > 1e3) pestScore += .4;
			else if (voc > 500) pestScore += .3;
			else if (voc > 250) pestScore += .2;
			else if (voc > 100) pestScore += .08;
		}
		if (hum !== null) {
			if (hum > 80) pestScore += .25;
			else if (hum > 70) pestScore += .18;
			else if (hum > 65) pestScore += .1;
		}
		if (temp !== null) {
			if (temp > 35) pestScore += .18;
			else if (temp > 30) pestScore += .2;
			else if (temp > 25) pestScore += .12;
			else if (temp > 20) pestScore += .05;
		}
		if (moist !== null) {
			if (moist > 18) pestScore += .15;
			else if (moist > 15) pestScore += .12;
			else if (moist > 14) pestScore += .08;
			else if (moist > 13) pestScore += .03;
		}
		pestScore = Math.min(1, Math.max(0, pestScore));
		let mlRiskClass = null;
		let mlRiskScore = null;
		let mlConfidence = null;
		let batchId = null;
		const batch = activeBatchMap.get(dev.silo_id);
		if (batch && temp != null && hum != null) {
			batchId = batch.id;
			const storageDays = batch.intake_date ? Math.floor((now.getTime() - new Date(batch.intake_date).getTime()) / (1e3 * 3600 * 24)) : 0;
			const mlThrottleCutoff = (/* @__PURE__ */ new Date(now.getTime() - 6e4)).toISOString();
			const { data: recentMl } = await supabaseAdmin.from("sensor_readings").select("id").eq("device_id", dev.id).not("ml_risk_class", "is", null).gte("reading_timestamp", mlThrottleCutoff).limit(1).maybeSingle();
			try {
				if (recentMl) {} else {
					const mlRes = await runPythonMLInference({
						temperature: temp,
						humidity: hum,
						moisture: moist ?? 12,
						voc: voc ?? 0,
						co2: co2 ?? 400,
						storage_days: storageDays,
						grain_type: batch.grain_type || "wheat"
					});
					mlRiskClass = mlRes.risk_class;
					mlRiskScore = mlRes.risk_score;
					mlConfidence = mlRes.confidence;
					mlRes.factors;
					const cls = mlRiskClass?.toLowerCase();
					if (cls === "risky" || cls === "spoiled") {
						const fanSpeed = cls === "spoiled" ? 100 : 80;
						await writeFirebaseControl(dev.device_id, {
							ml_requested_fan: true,
							target_fan_speed: fanSpeed,
							ml_decision: cls,
							led2: false,
							led3: cls === "risky",
							led4: cls === "spoiled"
						});
					} else if (cls === "safe") await writeFirebaseControl(dev.device_id, {
						ml_requested_fan: false,
						target_fan_speed: 0,
						ml_decision: "safe",
						led2: true,
						led3: false,
						led4: false
					});
				}
			} catch (mlErr) {
				console.error("ML Inference error for device", dev.device_id, mlErr);
			}
		}
		let readingTime = now.toISOString();
		const rawTsRaw = live.timestamp ?? live.timestamp_unix ?? live.ts;
		if (typeof rawTsRaw === "number") {
			const ms = rawTsRaw < 2e9 ? rawTsRaw * 1e3 : rawTsRaw;
			readingTime = new Date(ms).toISOString();
		}
		const { error } = await supabaseAdmin.from("sensor_readings").insert({
			device_id: dev.id,
			admin_id: dev.admin_id,
			silo_id: dev.silo_id,
			warehouse_id: dev.warehouse_id,
			batch_id: batchId,
			temperature_value: temp,
			humidity_value: hum,
			co2_value: co2,
			voc_value: voc,
			moisture_value: moist,
			ambient_light: ambientLight,
			ml_risk_class: mlRiskClass,
			ml_risk_score: mlRiskScore,
			ml_confidence: mlConfidence,
			fan_state: fanState,
			lid_state: servoState,
			battery_level: g("battery"),
			signal_strength: g("signal"),
			raw_payload: {
				...live,
				pestScore
			},
			reading_timestamp: readingTime
		});
		if (!error) {
			synced++;
			const { data: deviceRow } = await supabaseAdmin.from("sensor_devices").select("data_stats, health_metrics").eq("id", dev.id).single();
			const stats = deviceRow?.data_stats ?? {};
			const health = deviceRow?.health_metrics ?? {};
			await supabaseAdmin.from("sensor_devices").update({
				last_heartbeat: now.toISOString(),
				connection_status: "online",
				status: "active",
				health_metrics: {
					uptime_percentage: health.uptime_percentage ?? 100,
					error_count: health.error_count ?? 0,
					...health.last_error ? { last_error: health.last_error } : {},
					last_heartbeat: now.toISOString()
				},
				data_stats: {
					total_readings: (stats.total_readings ?? 0) + 1,
					readings_today: (stats.readings_today ?? 0) + 1,
					last_reading_date: now.toISOString()
				}
			}).eq("id", dev.id);
			if (temp != null && hum != null && batch) appendToMLDataset({
				temperature: temp,
				humidity: hum,
				moisture: moist ?? 14,
				storageDays: batch.intake_date ? Math.floor((now.getTime() - new Date(batch.intake_date).getTime()) / (1e3 * 3600 * 24)) : 0,
				airflow: airflowVal,
				light: ambientLight ?? 0,
				pestScore,
				grainType: batch.grain_type || "rice"
			});
			if (dev.silo_id && (temp != null || hum != null)) {
				const alertsToCreate = [];
				if (temp != null && temp > 35) alertsToCreate.push({
					alert_id: `TEMP-${Date.now()}`,
					admin_id: dev.admin_id,
					source: "system",
					silo_id: dev.silo_id,
					warehouse_id: dev.warehouse_id,
					batch_id: batchId,
					title: "High Temperature Warning",
					message: `Temperature reached ${temp.toFixed(1)}°C`,
					priority: "high",
					status: "pending",
					triggered_at: now.toISOString()
				});
				if (hum != null && hum > 14.5) alertsToCreate.push({
					alert_id: `HUM-${Date.now()}`,
					admin_id: dev.admin_id,
					source: "system",
					silo_id: dev.silo_id,
					warehouse_id: dev.warehouse_id,
					batch_id: batchId,
					title: "High Humidity Warning",
					message: `Humidity reached ${hum.toFixed(1)}%`,
					priority: "medium",
					status: "pending",
					triggered_at: now.toISOString()
				});
				if (fanState === 0 && servoState === 0 && ambientLight != null && ambientLight > 5) {
					const leakCutoff = (/* @__PURE__ */ new Date(now.getTime() - 1800 * 1e3)).toISOString();
					const { data: recentLeak } = await supabaseAdmin.from("grain_alerts").select("id").eq("device_id", dev.id).eq("title", "⚠️ Silo Light Leakage Detected").gte("triggered_at", leakCutoff).limit(1).maybeSingle();
					if (!recentLeak) alertsToCreate.push({
						alert_id: `LEAK-${Date.now()}`,
						admin_id: dev.admin_id,
						source: "system",
						silo_id: dev.silo_id,
						warehouse_id: dev.warehouse_id,
						batch_id: batchId,
						title: "⚠️ Silo Light Leakage Detected",
						message: `LDR sensor detected ${ambientLight.toFixed(1)}% light inside sealed silo (fan OFF, lid CLOSED). Possible structural breach, hole, or unauthorized opening.`,
						priority: ambientLight > 30 ? "critical" : "high",
						status: "pending",
						triggered_at: now.toISOString()
					});
				}
				if (alertsToCreate.length > 0) await supabaseAdmin.from("grain_alerts").insert(alertsToCreate);
			}
			if (dev.silo_id) {
				const pwmVal = typeof live.pwm === "number" ? live.pwm : 0;
				const fanOn = live.fan_status === "running" || live.fan_state === 1 || pwmVal > 0;
				const pwm = pwmVal > 0 ? pwmVal : fanOn ? 100 : 0;
				await supabaseAdmin.from("actuators").update({
					is_on: !!fanOn,
					power_level: pwm
				}).eq("silo_id", dev.silo_id).eq("actuator_type", "fan");
			}
		}
	}
	const offlineThreshold = (/* @__PURE__ */ new Date(now.getTime() - 900 * 1e3)).toISOString();
	await supabaseAdmin.from("sensor_devices").update({
		status: "offline",
		connection_status: "offline"
	}).lt("last_ping_at", offlineThreshold).eq("status", "active");
	return Response.json({
		synced,
		total: deviceIds.length
	});
} } } });
/**
* Daily lifecycle emails cron.
*
* Auth: pass `?apikey=<SUPABASE_ANON_KEY>` or `apikey` header — matches the
* pattern used by pg_cron + pg_net. Also accepts `x-cron-secret` for manual
* runs (matches the existing `CRON_SECRET`).
*
* Sends: day3, day10, trial_ending (3 days before trial_ends_at),
* reengagement (30 days after last_login).
*/
var Route = createFileRoute("/api/public/cron/lifecycle-emails")({ server: { handlers: {
	POST: async ({ request }) => runLifecycleCron(request),
	GET: async ({ request }) => runLifecycleCron(request)
} } });
async function runLifecycleCron(request) {
	const url = new URL(request.url);
	const apiKey = request.headers.get("apikey") ?? url.searchParams.get("apikey") ?? "";
	const cronSecret = request.headers.get("x-cron-secret") ?? "";
	const anon = processModule.env.SUPABASE_PUBLISHABLE_KEY ?? processModule.env.SUPABASE_ANON_KEY ?? "";
	const expected = processModule.env.CRON_SECRET ?? "";
	if (!(anon && apiKey && apiKey === anon || expected && cronSecret && cronSecret === expected)) return new Response("Unauthorized", { status: 401 });
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { sendLifecycleEmail } = await import("./email-automation.functions-eo8Q__me.mjs");
	const now = Date.now();
	const day = 1440 * 60 * 1e3;
	const results = {
		day3: 0,
		day10: 0,
		trial_ending: 0,
		reengagement: 0,
		errors: 0
	};
	const { data: profiles, error } = await supabaseAdmin.from("profiles").select("id, created_at, last_login, trial_ends_at").limit(1e3);
	if (error) return Response.json({
		ok: false,
		error: error.message
	}, { status: 500 });
	for (const p of profiles ?? []) try {
		const created = p.created_at ? new Date(p.created_at).getTime() : null;
		const lastLogin = p.last_login ? new Date(p.last_login).getTime() : null;
		const trialEnds = p.trial_ends_at ? new Date(p.trial_ends_at).getTime() : null;
		if (created && now - created >= 3 * day && now - created < 5 * day) {
			const r = await sendLifecycleEmail(p.id, "day3");
			if ("sent" in r && r.sent) results.day3++;
		}
		if (created && now - created >= 10 * day && now - created < 12 * day) {
			const r = await sendLifecycleEmail(p.id, "day10");
			if ("sent" in r && r.sent) results.day10++;
		}
		if (trialEnds && trialEnds - now > 0 && trialEnds - now <= 3 * day) {
			const r = await sendLifecycleEmail(p.id, "trial_ending");
			if ("sent" in r && r.sent) results.trial_ending++;
		}
		if (lastLogin && now - lastLogin >= 30 * day) {
			const r = await sendLifecycleEmail(p.id, "reengagement");
			if ("sent" in r && r.sent) results.reengagement++;
		}
	} catch {
		results.errors++;
	}
	return Response.json({
		ok: true,
		processed: profiles?.length ?? 0,
		results
	});
}
var TermsRoute = Route$58.update({
	id: "/terms",
	path: "/terms",
	getParentRoute: () => Route$59
});
var TeamRoute = Route$57.update({
	id: "/team",
	path: "/team",
	getParentRoute: () => Route$59
});
var SitemapDotxmlRoute = Route$56.update({
	id: "/sitemap.xml",
	path: "/sitemap.xml",
	getParentRoute: () => Route$59
});
var PrivacyRoute = Route$55.update({
	id: "/privacy",
	path: "/privacy",
	getParentRoute: () => Route$59
});
var HelpRoute = Route$54.update({
	id: "/help",
	path: "/help",
	getParentRoute: () => Route$59
});
var DocsRoute = Route$53.update({
	id: "/docs",
	path: "/docs",
	getParentRoute: () => Route$59
});
var ContactRoute = Route$52.update({
	id: "/contact",
	path: "/contact",
	getParentRoute: () => Route$59
});
var CheckoutRoute = Route$51.update({
	id: "/checkout",
	path: "/checkout",
	getParentRoute: () => Route$59
});
var BlogRoute = Route$50.update({
	id: "/blog",
	path: "/blog",
	getParentRoute: () => Route$59
});
var AuthRoute = Route$49.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$59
});
var AboutRoute = Route$48.update({
	id: "/about",
	path: "/about",
	getParentRoute: () => Route$59
});
var AuthenticatedRouteRoute = Route$47.update({
	id: "/_authenticated",
	getParentRoute: () => Route$59
});
var IndexRoute = Route$46.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$59
});
var CheckoutIndexRoute = Route$63.update({
	id: "/",
	path: "/",
	getParentRoute: () => CheckoutRoute
});
var CheckoutSuccessRoute = Route$64.update({
	id: "/success",
	path: "/success",
	getParentRoute: () => CheckoutRoute
});
var AuthVerifyOtpRoute = Route$62.update({
	id: "/verify-otp",
	path: "/verify-otp",
	getParentRoute: () => AuthRoute
});
var AuthSignupRoute = Route$61.update({
	id: "/signup",
	path: "/signup",
	getParentRoute: () => AuthRoute
});
var AuthResetPasswordRoute = Route$45.update({
	id: "/reset-password",
	path: "/reset-password",
	getParentRoute: () => AuthRoute
});
var AuthLoginRoute = Route$60.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => AuthRoute
});
var AuthForgotPasswordRoute = Route$44.update({
	id: "/forgot-password",
	path: "/forgot-password",
	getParentRoute: () => AuthRoute
});
var AuthenticatedWarehousesRoute = Route$43.update({
	id: "/warehouses",
	path: "/warehouses",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedTraceabilityRoute = Route$42.update({
	id: "/traceability",
	path: "/traceability",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedTeamManagementRoute = Route$41.update({
	id: "/team-management",
	path: "/team-management",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedSubscriptionRoute = Route$40.update({
	id: "/subscription",
	path: "/subscription",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedSilosRoute = Route$39.update({
	id: "/silos",
	path: "/silos",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedSettingsRoute = Route$38.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedServerMonitoringRoute = Route$37.update({
	id: "/server-monitoring",
	path: "/server-monitoring",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedSensorsRoute = Route$36.update({
	id: "/sensors",
	path: "/sensors",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedSecurityCenterRoute = Route$35.update({
	id: "/security-center",
	path: "/security-center",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedRevenueRoute = Route$34.update({
	id: "/revenue",
	path: "/revenue",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedReportsRoute = Route$33.update({
	id: "/reports",
	path: "/reports",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedPlansRoute = Route$32.update({
	id: "/plans",
	path: "/plans",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedOrdersRoute = Route$31.update({
	id: "/orders",
	path: "/orders",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedNotificationsRoute = Route$30.update({
	id: "/notifications",
	path: "/notifications",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedNotAllowedRoute = Route$29.update({
	id: "/not-allowed",
	path: "/not-allowed",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedMlModelsRoute = Route$28.update({
	id: "/ml-models",
	path: "/ml-models",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedMaintenanceRoute = Route$27.update({
	id: "/maintenance",
	path: "/maintenance",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedInsuranceRoute = Route$26.update({
	id: "/insurance",
	path: "/insurance",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedIncidentsRoute = Route$25.update({
	id: "/incidents",
	path: "/incidents",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedGrainBatchesRoute = Route$24.update({
	id: "/grain-batches",
	path: "/grain-batches",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedGrainAlertsRoute = Route$23.update({
	id: "/grain-alerts",
	path: "/grain-alerts",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedEnvironmentalRoute = Route$22.update({
	id: "/environmental",
	path: "/environmental",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedDataVisualizationRoute = Route$21.update({
	id: "/data-visualization",
	path: "/data-visualization",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedDashboardRoute = Route$20.update({
	id: "/dashboard",
	path: "/dashboard",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedBuyersRoute = Route$19.update({
	id: "/buyers",
	path: "/buyers",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedAnalyticsRoute = Route$18.update({
	id: "/analytics",
	path: "/analytics",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedAiPredictionsRoute = Route$17.update({
	id: "/ai-predictions",
	path: "/ai-predictions",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedActuatorsRoute = Route$16.update({
	id: "/actuators",
	path: "/actuators",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedActivityLogsRoute = Route$15.update({
	id: "/activity-logs",
	path: "/activity-logs",
	getParentRoute: () => AuthenticatedRouteRoute
});
var ApiFirebaseLiveSensorsRoute = Route$14.update({
	id: "/api/firebase/live-sensors",
	path: "/api/firebase/live-sensors",
	getParentRoute: () => Route$59
});
var AuthenticatedPlatformUsersRoute = Route$13.update({
	id: "/platform/users",
	path: "/platform/users",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedPlatformTenantsRoute = Route$12.update({
	id: "/platform/tenants",
	path: "/platform/tenants",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedPlatformPipelineRoute = Route$11.update({
	id: "/platform/pipeline",
	path: "/platform/pipeline",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedPlatformOrdersRoute = Route$10.update({
	id: "/platform/orders",
	path: "/platform/orders",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedPlatformLogsRoute = Route$9.update({
	id: "/platform/logs",
	path: "/platform/logs",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedPlatformLeadsRoute = Route$8.update({
	id: "/platform/leads",
	path: "/platform/leads",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedPlatformHealthRoute = Route$7.update({
	id: "/platform/health",
	path: "/platform/health",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedPlatformAuditLogsRoute = Route$6.update({
	id: "/platform/audit-logs",
	path: "/platform/audit-logs",
	getParentRoute: () => AuthenticatedRouteRoute
});
var ApiPublicWebhooksStripeRoute = Route$5.update({
	id: "/api/public/webhooks/stripe",
	path: "/api/public/webhooks/stripe",
	getParentRoute: () => Route$59
});
var ApiPublicHooksSensorOfflineDetectorRoute = Route$4.update({
	id: "/api/public/hooks/sensor-offline-detector",
	path: "/api/public/hooks/sensor-offline-detector",
	getParentRoute: () => Route$59
});
var ApiPublicHooksExpiryRemindersRoute = Route$3.update({
	id: "/api/public/hooks/expiry-reminders",
	path: "/api/public/hooks/expiry-reminders",
	getParentRoute: () => Route$59
});
var ApiPublicHooksAlertsEscalationRoute = Route$2.update({
	id: "/api/public/hooks/alerts-escalation",
	path: "/api/public/hooks/alerts-escalation",
	getParentRoute: () => Route$59
});
var ApiPublicCronSyncFirebaseRoute = Route$1.update({
	id: "/api/public/cron/sync-firebase",
	path: "/api/public/cron/sync-firebase",
	getParentRoute: () => Route$59
});
var ApiPublicCronLifecycleEmailsRoute = Route.update({
	id: "/api/public/cron/lifecycle-emails",
	path: "/api/public/cron/lifecycle-emails",
	getParentRoute: () => Route$59
});
var AuthenticatedRouteRouteChildren = {
	AuthenticatedActivityLogsRoute,
	AuthenticatedActuatorsRoute,
	AuthenticatedAiPredictionsRoute,
	AuthenticatedAnalyticsRoute,
	AuthenticatedBuyersRoute,
	AuthenticatedDashboardRoute,
	AuthenticatedDataVisualizationRoute,
	AuthenticatedEnvironmentalRoute,
	AuthenticatedGrainAlertsRoute,
	AuthenticatedGrainBatchesRoute,
	AuthenticatedIncidentsRoute,
	AuthenticatedInsuranceRoute,
	AuthenticatedMaintenanceRoute,
	AuthenticatedMlModelsRoute,
	AuthenticatedNotAllowedRoute,
	AuthenticatedNotificationsRoute,
	AuthenticatedOrdersRoute,
	AuthenticatedPlansRoute,
	AuthenticatedReportsRoute,
	AuthenticatedRevenueRoute,
	AuthenticatedSecurityCenterRoute,
	AuthenticatedSensorsRoute,
	AuthenticatedServerMonitoringRoute,
	AuthenticatedSettingsRoute,
	AuthenticatedSilosRoute,
	AuthenticatedSubscriptionRoute,
	AuthenticatedTeamManagementRoute,
	AuthenticatedTraceabilityRoute,
	AuthenticatedWarehousesRoute,
	AuthenticatedPlatformAuditLogsRoute,
	AuthenticatedPlatformHealthRoute,
	AuthenticatedPlatformLeadsRoute,
	AuthenticatedPlatformLogsRoute,
	AuthenticatedPlatformOrdersRoute,
	AuthenticatedPlatformPipelineRoute,
	AuthenticatedPlatformTenantsRoute,
	AuthenticatedPlatformUsersRoute
};
var AuthenticatedRouteRouteWithChildren = AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren);
var AuthRouteChildren = {
	AuthForgotPasswordRoute,
	AuthLoginRoute,
	AuthResetPasswordRoute,
	AuthSignupRoute,
	AuthVerifyOtpRoute
};
var AuthRouteWithChildren = AuthRoute._addFileChildren(AuthRouteChildren);
var CheckoutRouteChildren = {
	CheckoutSuccessRoute,
	CheckoutIndexRoute
};
var rootRouteChildren = {
	IndexRoute,
	AuthenticatedRouteRoute: AuthenticatedRouteRouteWithChildren,
	AboutRoute,
	AuthRoute: AuthRouteWithChildren,
	BlogRoute,
	CheckoutRoute: CheckoutRoute._addFileChildren(CheckoutRouteChildren),
	ContactRoute,
	DocsRoute,
	HelpRoute,
	PrivacyRoute,
	SitemapDotxmlRoute,
	TeamRoute,
	TermsRoute,
	ApiFirebaseLiveSensorsRoute,
	ApiPublicCronLifecycleEmailsRoute,
	ApiPublicCronSyncFirebaseRoute,
	ApiPublicHooksAlertsEscalationRoute,
	ApiPublicHooksExpiryRemindersRoute,
	ApiPublicHooksSensorOfflineDetectorRoute,
	ApiPublicWebhooksStripeRoute
};
var routeTree = Route$59._addFileChildren(rootRouteChildren)._addFileTypes();
var TABLE = /* @__PURE__ */ new Set([
	"/grain-batches",
	"/silos",
	"/sensors",
	"/actuators",
	"/warehouses",
	"/grain-alerts",
	"/buyers",
	"/incidents",
	"/maintenance",
	"/notifications",
	"/orders",
	"/activity-logs",
	"/team-management",
	"/platform/tenants",
	"/platform/users",
	"/platform/leads",
	"/platform/orders",
	"/platform/audit-logs",
	"/platform/logs"
]);
var INSIGHT = /* @__PURE__ */ new Set([
	"/analytics",
	"/ai-predictions",
	"/reports",
	"/data-visualization",
	"/traceability",
	"/ml-models",
	"/revenue",
	"/environmental",
	"/server-monitoring",
	"/security-center",
	"/revenue",
	"/platform/pipeline",
	"/platform/health"
]);
var FORM = /* @__PURE__ */ new Set([
	"/settings",
	"/subscription",
	"/plans",
	"/insurance",
	"/platform/plans"
]);
function AutoPending() {
	const pathname = useRouterState({ select: (r) => r.location.pathname });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageSkeleton, { variant: TABLE.has(pathname) ? "table" : INSIGHT.has(pathname) ? "insight" : FORM.has(pathname) ? "form" : "dashboard" });
}
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		defaultPendingMs: 200,
		defaultPendingMinMs: 300,
		defaultPendingComponent: AutoPending
	});
};
//#endregion
export { getRouter };
