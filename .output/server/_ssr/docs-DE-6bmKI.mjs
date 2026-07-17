import { t as motion } from "../_libs/framer-motion.mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { E as Terminal, Gt as Cloud, Lt as Download, Ot as FileText, P as Smartphone, Wt as Code } from "../_libs/lucide-react.mjs";
import { n as NewGlassNav, t as NewFooter } from "./NewFooter-BNo3iHuN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/docs-DE-6bmKI.js
var import_jsx_runtime = require_jsx_runtime();
function DocumentationPage() {
	const docSections = [
		{
			icon: FileText,
			title: "User Guide",
			description: "Complete guide to using GrainHero platform features and real-time monitoring.",
			items: [
				"Dashboard & Analytics",
				"Silo & Warehouse Management",
				"Alert Configuration",
				"Batch Tracking & Reports"
			]
		},
		{
			icon: Terminal,
			title: "API Documentation",
			description: "Server functions and API endpoints for grain storage operations.",
			items: [
				"Supabase Authentication",
				"Sensor Data Endpoints",
				"AI Prediction APIs",
				"Analytics Functions"
			]
		},
		{
			icon: Code,
			title: "ML & AI Integration",
			description: "Machine learning models for spoilage prediction and anomaly detection.",
			items: [
				"Python ML Inference",
				"Gemini AI Insights",
				"Risk Classification Models",
				"Real-time Predictions"
			]
		},
		{
			icon: Smartphone,
			title: "Platform Features",
			description: "Core features available in the GrainHero web platform.",
			items: [
				"Real-time Monitoring",
				"Predictive Analytics",
				"Insurance & Claims",
				"Team Management"
			]
		},
		{
			icon: Cloud,
			title: "IoT & Sensor Integration",
			description: "IoT sensor specifications and data collection protocols.",
			items: [
				"Temperature & Humidity Sensors",
				"Moisture & CO2 Monitoring",
				"VOC Detection",
				"Firebase Real-time Sync"
			]
		},
		{
			icon: Download,
			title: "Data & Reports",
			description: "Export capabilities and reporting tools for grain storage data.",
			items: [
				"Batch Analytics",
				"Risk Reports",
				"Traceability Logs",
				"Activity History"
			]
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "min-h-screen bg-[#EDE9D4]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewGlassNav, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "relative pt-32 pb-16 sm:pt-40 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-[#252d26] overflow-hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-0 opacity-10",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
						backgroundImage: "radial-gradient(circle at 2px 2px, rgba(47,172,12,0.4) 1px, transparent 0)",
						backgroundSize: "40px 40px",
						width: "100%",
						height: "100%"
					} })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-w-4xl mx-auto text-center relative z-10",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
						initial: {
							opacity: 0,
							y: 30
						},
						animate: {
							opacity: 1,
							y: 0
						},
						transition: { duration: .6 },
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "inline-block bg-[#2FAC0C]/10 px-4 py-2 rounded-full mb-6",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C] text-sm font-semibold uppercase tracking-wider",
									children: "Documentation"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6",
								children: ["Technical ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C]",
									children: "Documentation"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xl text-[#EDE9D4]/80 leading-relaxed",
								children: "Everything you need to know about using and integrating with GrainHero"
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-8 bg-white border-b border-[#2FAC0C]/10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap justify-center gap-4",
						children: [
							{
								name: "Getting Started",
								link: "/help"
							},
							{
								name: "API Reference",
								link: "#"
							},
							{
								name: "Tutorials",
								link: "/help"
							},
							{
								name: "FAQ",
								link: "/#faq"
							},
							{
								name: "Support",
								link: "/contact"
							}
						].map((link) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => window.location.href = link.link,
							className: "px-6 py-2 bg-[#EDE9D4] hover:bg-[#2FAC0C]/10 rounded-full text-[#252d26] font-semibold transition-colors border border-[#2FAC0C]/20",
							children: link.name
						}, link.name))
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-w-7xl mx-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid md:grid-cols-2 lg:grid-cols-3 gap-6",
						children: docSections.map((section, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
							initial: {
								opacity: 0,
								y: 30
							},
							whileInView: {
								opacity: 1,
								y: 0
							},
							viewport: { once: true },
							transition: {
								duration: .5,
								delay: index * .1
							},
							className: "bg-[#EDE9D4] rounded-2xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-[#2FAC0C]/30 cursor-pointer",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-[#2FAC0C]/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(section.icon, { className: "w-6 h-6 text-[#2FAC0C]" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-xl font-bold text-[#252d26] mb-2",
									children: section.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[#404F44] text-sm mb-4",
									children: section.description
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "space-y-1.5",
									children: section.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "text-[#404F44] text-sm flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-1 h-1 bg-[#2FAC0C] rounded-full" }), item]
									}, item))
								})
							]
						}, section.title))
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-w-4xl mx-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
						initial: {
							opacity: 0,
							y: 30
						},
						whileInView: {
							opacity: 1,
							y: 0
						},
						viewport: { once: true },
						transition: { duration: .6 },
						className: "bg-white rounded-2xl p-8 border-2 border-[#2FAC0C]/20",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-4 mb-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-[#2FAC0C]/10 px-4 py-2 rounded-full",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[#2FAC0C] font-bold",
										children: "v3.2"
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-2xl font-black text-[#252d26]",
									children: "ML Model: Spoilage Risk Classifier"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[#404F44] mb-6",
								children: "GrainHero uses advanced machine learning models including Gradient Boosted Trees for spoilage classification, Isolation Forest for anomaly detection, and LSTM networks for yield forecasting. Our AI leverages temperature, humidity, moisture, CO₂, VOC, and storage duration data to predict grain spoilage 24-48 hours in advance with high accuracy."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "bg-[#2FAC0C] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#2FAC0C]/90 hover:scale-105 transition-all",
								onClick: () => window.location.href = "/help",
								children: "View Technical Specs"
							})
						]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewFooter, {})
		]
	});
}
//#endregion
export { DocumentationPage as component };
