import { t as motion } from "../_libs/framer-motion.mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { Ct as Heart, D as Target, d as Users, vn as Award } from "../_libs/lucide-react.mjs";
import { n as NewGlassNav, t as NewFooter } from "./NewFooter-BNo3iHuN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/about-BOKLu6kc.js
var import_jsx_runtime = require_jsx_runtime();
function AboutPage() {
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
									children: "Our Story"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6",
								children: ["About ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C]",
									children: "GrainHero"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xl text-[#EDE9D4]/80 leading-relaxed",
								children: "Revolutionizing grain storage with AI-powered technology to protect harvests and empower farmers worldwide."
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-w-7xl mx-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid md:grid-cols-2 gap-8 lg:gap-12",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
							initial: {
								opacity: 0,
								x: -30
							},
							whileInView: {
								opacity: 1,
								x: 0
							},
							viewport: { once: true },
							transition: { duration: .6 },
							className: "bg-[#EDE9D4] rounded-2xl p-8 border-2 border-[#2FAC0C]/20 hover:scale-105 transition-all duration-300",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-[#2FAC0C]/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, { className: "w-8 h-8 text-[#2FAC0C]" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-3xl font-black text-[#252d26] mb-4",
									children: "Our Mission"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[#404F44] text-lg leading-relaxed",
									children: "To eliminate grain spoilage and post-harvest losses by providing farmers and grain operators with intelligent, accessible, and affordable IoT monitoring solutions powered by artificial intelligence."
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
							initial: {
								opacity: 0,
								x: 30
							},
							whileInView: {
								opacity: 1,
								x: 0
							},
							viewport: { once: true },
							transition: { duration: .6 },
							className: "bg-[#EDE9D4] rounded-2xl p-8 border-2 border-[#2FAC0C]/20 hover:scale-105 transition-all duration-300",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-[#2FAC0C]/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, { className: "w-8 h-8 text-[#2FAC0C]" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-3xl font-black text-[#252d26] mb-4",
									children: "Our Vision"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[#404F44] text-lg leading-relaxed",
									children: "A world where no grain is lost to preventable spoilage. Where every farmer has access to enterprise-grade technology that protects their harvest and maximizes their livelihood."
								})
							]
						})]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-w-4xl mx-auto",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
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
						className: "text-center mb-12",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-3xl sm:text-4xl lg:text-5xl font-black text-[#252d26] mb-6",
							children: ["Our ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[#2FAC0C]",
								children: "Story"
							})]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
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
							duration: .6,
							delay: .2
						},
						className: "prose prose-lg max-w-none",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl p-8 shadow-sm border border-[#2FAC0C]/10",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[#404F44] leading-relaxed mb-4",
									children: "GrainHero was born from a simple observation: billions of dollars worth of grain are lost every year to spoilage, despite existing technology that could prevent it."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[#404F44] leading-relaxed mb-4",
									children: "Our founders—combining expertise in agriculture, software engineering, IoT systems, and artificial intelligence—came together with a shared mission: make enterprise-grade grain monitoring accessible to every farmer, regardless of their operation's size."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[#404F44] leading-relaxed mb-4",
									children: "What started as a university research project quickly evolved into a full-fledged platform serving thousands of farmers worldwide. Today, GrainHero monitors millions of bushels of grain, preventing spoilage and protecting livelihoods across continents."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[#404F44] leading-relaxed",
									children: "We're not just building software—we're building a future where technology empowers agriculture, where data drives decisions, and where no harvest is lost to preventable causes."
								})
							]
						})
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-w-7xl mx-auto",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
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
						className: "text-center mb-12",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-3xl sm:text-4xl lg:text-5xl font-black text-[#252d26] mb-4",
							children: ["Our ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[#2FAC0C]",
								children: "Values"
							})]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid md:grid-cols-2 lg:grid-cols-4 gap-6",
						children: [
							{
								icon: Users,
								title: "Farmer-First",
								description: "Every decision starts with how it benefits the farmers we serve."
							},
							{
								icon: Award,
								title: "Innovation",
								description: "We push boundaries with cutting-edge AI and IoT technology."
							},
							{
								icon: Target,
								title: "Accessibility",
								description: "Enterprise solutions should be available to farms of all sizes."
							},
							{
								icon: Heart,
								title: "Sustainability",
								description: "Reducing food waste contributes to a more sustainable planet."
							}
						].map((value, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
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
							className: "bg-[#EDE9D4] rounded-2xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-[#2FAC0C]/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(value.icon, { className: "w-6 h-6 text-[#2FAC0C]" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-xl font-bold text-[#252d26] mb-2",
									children: value.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[#404F44] text-sm",
									children: value.description
								})
							]
						}, value.title))
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#252d26]",
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
								className: "text-3xl sm:text-4xl lg:text-5xl font-black text-[#EDE9D4] mb-6",
								children: "Join Us in Our Mission"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xl text-[#EDE9D4]/80 mb-8",
								children: "Be part of the revolution in grain storage technology"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col sm:flex-row gap-4 justify-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										window.location.href = "/checkout";
									},
									className: "bg-[#2FAC0C] text-white font-bold px-10 py-4 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105",
									children: "View Plans"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										window.location.href = "/contact";
									},
									className: "bg-transparent border-2 border-[#EDE9D4] text-[#EDE9D4] font-semibold px-10 py-4 rounded-full hover:bg-[#EDE9D4] hover:text-[#252d26] hover:scale-105 transition-all duration-300",
									children: "Contact Us"
								})]
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
export { AboutPage as component };
