import { t as motion } from "../_libs/framer-motion.mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { Jt as Clock, bn as ArrowRight, ln as Calendar } from "../_libs/lucide-react.mjs";
import { n as NewGlassNav, t as NewFooter } from "./NewFooter-BNo3iHuN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/blog-ERe_-mmc.js
var import_jsx_runtime = require_jsx_runtime();
var blogPosts = [
	{
		id: 1,
		title: "5 Signs Your Grain Storage Needs Better Monitoring",
		excerpt: "Learn the warning signs that indicate your grain storage facility could benefit from automated IoT monitoring systems.",
		category: "Best Practices",
		date: "2026-07-10",
		readTime: "5 min read",
		image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format"
	},
	{
		id: 2,
		title: "How AI Predicts Grain Spoilage Before It Happens",
		excerpt: "Discover the machine learning algorithms behind GrainHero's predictive analytics and how they save farmers millions.",
		category: "Technology",
		date: "2026-07-08",
		readTime: "8 min read",
		image: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=800&auto=format"
	},
	{
		id: 3,
		title: "The True Cost of Grain Spoilage in 2026",
		excerpt: "An in-depth analysis of post-harvest losses and how modern technology is changing the economics of grain storage.",
		category: "Industry Insights",
		date: "2026-07-05",
		readTime: "6 min read",
		image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format"
	},
	{
		id: 4,
		title: "IoT Sensors: Your First Line of Defense",
		excerpt: "Understanding the different types of sensors used in grain monitoring and how they work together.",
		category: "Technology",
		date: "2026-07-01",
		readTime: "7 min read",
		image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format"
	},
	{
		id: 5,
		title: "Customer Success Story: Reducing Losses by 35%",
		excerpt: "How Johnson Farms implemented GrainHero and transformed their grain storage operations.",
		category: "Case Study",
		date: "2026-06-28",
		readTime: "4 min read",
		image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format"
	},
	{
		id: 6,
		title: "Summer Storage Tips: Keeping Grain Cool",
		excerpt: "Expert advice on maintaining optimal storage conditions during the hot summer months.",
		category: "Best Practices",
		date: "2026-06-25",
		readTime: "5 min read",
		image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format"
	}
];
function BlogPage() {
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
									children: "Knowledge Hub"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6",
								children: ["GrainHero ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C]",
									children: "Blog"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xl text-[#EDE9D4]/80 leading-relaxed",
								children: "Insights, tips, and updates from the world of smart grain storage"
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 sm:py-24 px-4 sm:px-6 lg:px-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-w-7xl mx-auto",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid md:grid-cols-2 lg:grid-cols-3 gap-8",
						children: blogPosts.map((post, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.article, {
							initial: {
								opacity: 0,
								y: 30
							},
							animate: {
								opacity: 1,
								y: 0
							},
							transition: {
								duration: .5,
								delay: index * .1
							},
							className: "bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#2FAC0C]/10 group cursor-pointer hover:scale-105",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative h-48 overflow-hidden bg-[#EDE9D4]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-br from-[#2FAC0C]/20 to-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "absolute top-4 left-4 bg-[#2FAC0C] text-white text-xs font-bold px-3 py-1 rounded-full",
									children: post.category
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-6",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-4 text-xs text-[#404F44]/60 mb-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: new Date(post.date).toLocaleDateString("en-US", {
												month: "short",
												day: "numeric",
												year: "numeric"
											}) })]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: post.readTime })]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-xl font-bold text-[#252d26] mb-2 group-hover:text-[#2FAC0C] transition-colors",
										children: post.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[#404F44] text-sm leading-relaxed mb-4",
										children: post.excerpt
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										className: "text-[#2FAC0C] font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all",
										children: ["Read More", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "w-4 h-4" })]
									})
								]
							})]
						}, post.id))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
						initial: { opacity: 0 },
						animate: { opacity: 1 },
						transition: { delay: .6 },
						className: "text-center mt-12",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "bg-[#2FAC0C] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#2FAC0C]/90 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl",
							children: "Load More Articles"
						})
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewFooter, {})
		]
	});
}
//#endregion
export { BlogPage as component };
