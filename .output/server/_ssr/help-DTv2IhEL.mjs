import { t as motion } from "../_libs/framer-motion.mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { U as Search, ft as Mail, lt as MessageCircle, mn as Book, u as Video } from "../_libs/lucide-react.mjs";
import { n as NewGlassNav, t as NewFooter } from "./NewFooter-BNo3iHuN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/help-DTv2IhEL.js
var import_jsx_runtime = require_jsx_runtime();
function HelpCenterPage() {
	const helpCategories = [
		{
			icon: Book,
			title: "Getting Started",
			description: "Learn the basics of GrainHero and set up your first silo monitoring system.",
			topics: [
				"Installation Guide",
				"First-Time Setup",
				"Quick Start Tutorial",
				"Mobile App Basics"
			]
		},
		{
			icon: Video,
			title: "Video Tutorials",
			description: "Watch step-by-step video guides covering all aspects of the platform.",
			topics: [
				"Sensor Installation",
				"Dashboard Overview",
				"Alert Configuration",
				"Report Generation"
			]
		},
		{
			icon: MessageCircle,
			title: "FAQs",
			description: "Find quick answers to the most commonly asked questions.",
			topics: [
				"Billing & Pricing",
				"Technical Support",
				"Account Management",
				"Features & Capabilities"
			]
		},
		{
			icon: Search,
			title: "Troubleshooting",
			description: "Resolve common issues and technical problems quickly.",
			topics: [
				"Connection Issues",
				"Sensor Calibration",
				"Alert Problems",
				"Data Sync Issues"
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
									children: "Help Center"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6",
								children: ["How Can We ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C]",
									children: "Help You?"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xl text-[#EDE9D4]/80 leading-relaxed mb-8",
								children: "Find answers, tutorials, and get support for all your GrainHero needs"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "max-w-2xl mx-auto relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									placeholder: "Search for help articles...",
									className: "w-full px-6 py-4 pl-14 rounded-full bg-white/10 backdrop-blur-md border-2 border-[#2FAC0C]/30 text-[#EDE9D4] placeholder-[#EDE9D4]/50 focus:outline-none focus:border-[#2FAC0C] transition-all"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2FAC0C]" })]
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-w-7xl mx-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid md:grid-cols-2 gap-6 lg:gap-8",
						children: helpCategories.map((category, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
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
							className: "bg-[#EDE9D4] rounded-2xl p-6 sm:p-8 hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-[#2FAC0C]/30",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-[#2FAC0C]/10 w-14 h-14 rounded-xl flex items-center justify-center mb-4",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(category.icon, { className: "w-7 h-7 text-[#2FAC0C]" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-2xl font-bold text-[#252d26] mb-2",
									children: category.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[#404F44] mb-4",
									children: category.description
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "space-y-2",
									children: category.topics.map((topic) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "text-[#404F44] text-sm flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-1.5 h-1.5 bg-[#2FAC0C] rounded-full" }), topic]
									}, topic))
								})
							]
						}, category.title))
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-w-4xl mx-auto text-center",
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
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-3xl sm:text-4xl font-black text-[#252d26] mb-4",
								children: "Still Need Help?"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-lg text-[#404F44] mb-8",
								children: "Our support team is here to assist you 24/7"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-col sm:flex-row gap-4 justify-center",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: "/contact",
									className: "bg-[#2FAC0C] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "w-5 h-5" }), "Contact Support"]
								})
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
export { HelpCenterPage as component };
