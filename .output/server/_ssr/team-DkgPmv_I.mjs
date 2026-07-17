import { o as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as NewGlassNav, t as NewFooter } from "./NewFooter-BNo3iHuN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/team-DkgPmv_I.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function TeamSection() {
	const [isVisible, setIsVisible] = (0, import_react.useState)(false);
	const [activeSlide, setActiveSlide] = (0, import_react.useState)(0);
	const [isMobile, setIsMobile] = (0, import_react.useState)(false);
	const founders = [
		{
			name: "Sharjeel Bilal",
			role: "Founder & CEO",
			bounty: "Strategic Visionary",
			description: "The driving force behind GrainHero, Sharjeel leads our mission to modernize global grain storage with a focus on sustainability and impact.",
			image: "/images/team/Sharjeel.jpeg",
			rotation: "rotate-2"
		},
		{
			name: "Muhammad Shaheer Khan",
			role: "Co-founder & COO",
			bounty: "Operations Lead",
			description: "Shaheer ensures the seamless execution of GrainHero’s operations, bridging the gap between innovative technology and real-world agricultural needs.",
			image: "/images/team/Shaheer.jpeg",
			rotation: "-rotate-1"
		},
		{
			name: "Atif Nazir",
			role: "Co-founder & CTO",
			bounty: "Tech Architect",
			description: "The technical mastermind combining software engineering, AI research, and IoT expertise to build our world-class monitoring platform.",
			image: "/images/team/Atif.jpeg",
			rotation: "rotate-1"
		}
	];
	(0, import_react.useEffect)(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 768);
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);
	(0, import_react.useEffect)(() => {
		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) setIsVisible(true);
		}, { threshold: .1 });
		const el = document.getElementById("team-section");
		if (el) observer.observe(el);
		return () => observer.disconnect();
	}, []);
	const nextSlide = (0, import_react.useCallback)(() => {
		setActiveSlide((prev) => (prev + 1) % founders.length);
	}, [founders.length]);
	(0, import_react.useEffect)(() => {
		if (!isMobile || !isVisible) return;
		const timer = setInterval(nextSlide, 3500);
		return () => clearInterval(timer);
	}, [
		isMobile,
		isVisible,
		nextSlide
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "team-section",
		className: "relative py-12 sm:py-24 bg-white overflow-visible",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "container mx-auto px-4 sm:px-8 lg:px-12 max-w-7xl",
			style: { overflow: "visible" },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-center mb-8 sm:mb-16",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: `text-3xl sm:text-5xl lg:text-6xl font-black leading-tight text-gray-900 transform transition-all duration-1000 delay-200 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block mb-1 sm:mb-2",
							children: "The People Behind"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-[#2FAC0C]",
							children: "GRAINHERO"
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "md:hidden max-w-sm mx-auto",
					style: { overflow: "visible" },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative h-[420px]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
							mode: "wait",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
								initial: {
									opacity: 0,
									x: 60,
									rotate: 3
								},
								animate: {
									opacity: 1,
									x: 0,
									rotate: 0
								},
								exit: {
									opacity: 0,
									x: -60,
									rotate: -3
								},
								transition: {
									duration: .5,
									ease: "easeInOut"
								},
								className: "absolute inset-0",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FounderCard, { founder: founders[activeSlide] })
							}, activeSlide)
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex justify-center gap-2 mt-4",
						children: founders.map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setActiveSlide(i),
							className: `w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${i === activeSlide ? "bg-[#00a63e] scale-125" : "bg-gray-300"}`,
							"aria-label": `View founder ${i + 1}`
						}, i))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "hidden md:block max-w-6xl mx-auto",
					style: { overflow: "visible" },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						style: { overflow: "visible" },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "bg-gradient-to-br from-black via-gray-900 to-black p-6 sm:p-8 rounded-2xl shadow-2xl relative border border-gray-800/50",
							style: { overflow: "visible" },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 rounded-xl p-6 sm:p-8 relative",
								style: { overflow: "visible" },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "relative z-10 grid grid-cols-3 gap-6 lg:gap-8",
									style: { overflow: "visible" },
									children: founders.map((founder, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
										initial: {
											opacity: 0,
											y: 30,
											rotate: 0
										},
										animate: isVisible ? {
											opacity: 1,
											y: 0,
											rotate: parseInt(founder.rotation) || 0
										} : {},
										transition: {
											delay: index * .2 + .5,
											duration: .6
										},
										whileHover: {
											rotate: 0,
											scale: 1.05,
											zIndex: 20
										},
										className: "group cursor-pointer",
										style: {
											filter: "drop-shadow(4px 4px 8px rgba(0,0,0,0.3))",
											overflow: "visible"
										},
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FounderCard, { founder })
									}, founder.name))
								})
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -inset-4 bg-black/20 rounded-2xl -z-10 blur-xl" })]
					})
				})
			]
		})
	});
}
function FounderCard({ founder }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "bg-gradient-to-b from-white to-gray-50 border-4 border-black relative shadow-lg",
		style: { overflow: "visible" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -top-2 left-4 w-4 h-4 bg-gradient-to-br from-[#00a63e] to-[#029238] rounded-full shadow-lg border border-green-700" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -top-2 right-4 w-4 h-4 bg-gradient-to-br from-[#00a63e] to-[#029238] rounded-full shadow-lg border border-green-700" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-5 sm:p-6 text-center relative z-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 sm:mb-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-xl sm:text-3xl font-black text-[#00a63e] mb-2",
							style: {
								fontFamily: "serif",
								letterSpacing: "0.08em"
							},
							children: "FOUNDER"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-full h-0.5 bg-[#00a63e]" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative mb-3 sm:mb-4 mx-auto w-24 h-24 sm:w-32 sm:h-32 border-2 border-black bg-gray-100 rounded-sm overflow-hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: founder.image,
							alt: founder.name,
							className: "absolute inset-0 w-full h-full object-cover",
							style: founder.name === "Sharjeel Bilal" ? {
								filter: "sepia(10%) contrast(105%) brightness(100%) saturate(95%)",
								width: "100%",
								height: "100%"
							} : { filter: "sepia(10%) contrast(105%) brightness(100%) saturate(95%)" }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-left space-y-1.5 sm:space-y-2",
						style: { fontFamily: "serif" },
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-black text-base sm:text-lg text-black",
								children: founder.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-bold text-[#00a63e] text-sm sm:text-base",
								children: founder.role
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider",
								children: founder.bounty
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs sm:text-sm text-gray-700 leading-relaxed bg-gray-50/50 p-2.5 sm:p-3 border-l-2 border-[#00a63e]",
								children: founder.description
							})
						]
					})
				]
			})
		]
	});
}
function TeamPage() {
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
									children: "Meet The Team"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6",
								children: ["The Minds Behind ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C]",
									children: "GrainHero"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xl text-[#EDE9D4]/80 leading-relaxed",
								children: "A passionate team dedicated to revolutionizing grain storage with cutting-edge technology"
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "bg-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TeamSection, {})
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
								children: "Want to Join Our Mission?"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xl text-[#EDE9D4]/80 mb-8",
								children: "Get started with GrainHero today and protect your harvest"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col sm:flex-row gap-4 justify-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										window.location.href = "/checkout";
									},
									className: "bg-[#2FAC0C] text-white font-bold px-10 py-4 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105",
									children: "Get Started"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										window.location.href = "/contact";
									},
									className: "bg-transparent border-2 border-[#EDE9D4] text-[#EDE9D4] font-semibold px-10 py-4 rounded-full hover:bg-[#EDE9D4] hover:text-[#252d26] transition-all duration-300",
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
export { TeamPage as component };
