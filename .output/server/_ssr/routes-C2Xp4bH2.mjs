import { o as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { $ as Plus, $t as CircleCheckBig, B as Settings, Gt as Cloud, I as Shield, Jt as Clock, P as Smartphone, Rt as DollarSign, Tt as Gauge, Vt as Cpu, a as Wifi, an as Check, b as TrendingUp, bn as ArrowRight, dn as Building2, hn as Bell, on as ChartLine, pn as Brain, r as Wrench, s as Wheat, sn as ChartColumn, st as Minus, t as Zap, x as TrendingDown, yn as ArrowUpRight } from "../_libs/lucide-react.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as NewGlassNav, t as NewFooter } from "./NewFooter-BNo3iHuN.mjs";
import { n as pricingData } from "./pricing-data-BA_Y9Elr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-C2Xp4bH2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function NewHeroSection() {
	const videoRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (videoRef.current) {
			videoRef.current.volume = 0;
			videoRef.current.muted = true;
			videoRef.current.defaultMuted = true;
			const playPromise = videoRef.current.play();
			if (playPromise !== void 0) playPromise.catch(() => {});
		}
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative min-h-screen w-full overflow-hidden bg-[#252d26]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				ref: videoRef,
				className: "absolute inset-0 w-full h-full object-cover opacity-40",
				autoPlay: true,
				muted: true,
				loop: true,
				playsInline: true,
				poster: "/images/grain-fields-hero.jpg",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("source", {
					src: "https://videos.pexels.com/video-files/4702791/4702791-uhd_2560_1440_25fps.mp4",
					type: "video/mp4"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-br from-[#252d26] via-[#252d26]/95 to-[#252d26]/90" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-0 overflow-hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-20 right-20 w-96 h-96 bg-[#2FAC0C]/5 rounded-full blur-3xl animate-pulse" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute bottom-20 left-20 w-64 h-64 bg-[#2FAC0C]/10 rounded-full blur-3xl animate-pulse delay-1000" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "absolute top-32 left-10 w-12 h-12 text-[#2FAC0C]/10 animate-float" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "absolute top-1/4 right-16 w-16 h-16 text-[#2FAC0C]/10 animate-float-delay-1" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "absolute bottom-32 left-1/4 w-10 h-10 text-[#2FAC0C]/10 animate-float-delay-2" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "relative z-10 min-h-screen flex items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "container mx-auto px-4 sm:px-6 lg:px-8 py-20",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "max-w-5xl mx-auto text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.h1, {
								initial: {
									opacity: 0,
									y: 20
								},
								animate: {
									opacity: 1,
									y: 0
								},
								transition: { delay: .4 },
								className: "text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1] mb-6",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[#EDE9D4] block",
										children: "SMART GRAIN"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[#EDE9D4] block",
										children: "STORAGE"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[#2FAC0C] block mt-2",
										children: "Powered by AI"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.p, {
								initial: {
									opacity: 0,
									y: 20
								},
								animate: {
									opacity: 1,
									y: 0
								},
								transition: { delay: .6 },
								className: "text-[#EDE9D4]/80 text-xl sm:text-2xl leading-relaxed mb-10 max-w-3xl mx-auto",
								children: "Real-time IoT monitoring and predictive AI analytics that prevent spoilage, reduce losses, and maximize your profits."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
								initial: {
									opacity: 0,
									y: 20
								},
								animate: {
									opacity: 1,
									y: 0
								},
								transition: { delay: .8 },
								className: "flex flex-col sm:flex-row gap-3 justify-center ",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/checkout",
									className: "group bg-[#2FAC0C] text-white font-bold px-10 py-4 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-2xl hover:shadow-[#2FAC0C]/50 hover:scale-105 flex items-center justify-center gap-2 text-lg",
									children: ["View Plans & Pricing", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "w-5 h-5 group-hover:translate-x-1 transition-transform" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" });
									},
									className: "bg-transparent border-2 border-[#EDE9D4] text-[#EDE9D4] font-semibold px-10 py-4 rounded-full hover:bg-[#EDE9D4] hover:text-[#252d26] transition-all duration-300 text-lg hover:scale-105",
									children: "See How It Works"
								})]
							})
						]
					})
				})
			})
		]
	});
}
var features = [
	{
		icon: Gauge,
		title: "Real-Time Monitoring",
		description: "Track temperature, humidity, moisture, and CO₂ levels 24/7 with industrial IoT sensors providing second-by-second updates.",
		color: "#2FAC0C",
		bgColor: "#EDE9D4",
		image: "/images/features/Real_time_monitoring.png"
	},
	{
		icon: Brain,
		title: "AI Spoilage Prediction",
		description: "Machine learning algorithms analyze patterns to predict spoilage 24-48 hours in advance, preventing costly grain losses.",
		color: "#2FAC0C",
		bgColor: "#EDE9D4",
		image: "/images/features/AI_Spoilage_Prediction.png"
	},
	{
		icon: Bell,
		title: "Instant Alerts",
		description: "Receive immediate notifications via SMS, email, or push when conditions exceed safe thresholds. Never miss a critical event.",
		color: "#2FAC0C",
		bgColor: "#EDE9D4",
		image: "/images/features/Mobile_Alert_Notification.png"
	},
	{
		icon: ChartColumn,
		title: "Analytics Dashboard",
		description: "Comprehensive insights with historical data visualization, trend analysis, and automated reports for informed decision-making.",
		color: "#2FAC0C",
		bgColor: "#EDE9D4",
		image: "/images/features/Analytics_Dashboard.png"
	},
	{
		icon: Settings,
		title: "Remote Control",
		description: "Integrate with ventilation, cooling, and aeration systems for automated climate control based on AI recommendations.",
		color: "#2FAC0C",
		bgColor: "#EDE9D4",
		image: "/images/features/Remote_Control.png"
	},
	{
		icon: Building2,
		title: "Multi-Silo Management",
		description: "Monitor unlimited silos across multiple locations from a single dashboard. Scale effortlessly as your operation grows.",
		color: "#2FAC0C",
		bgColor: "#EDE9D4",
		image: "/images/features/Multi_Silo_Management.png"
	}
];
function FlipCard({ feature, index }) {
	const [isHovered, setIsHovered] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
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
			delay: index * .08
		},
		className: "flip-card-wrapper",
		style: {
			width: "100%",
			maxWidth: "300px",
			height: "226px"
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flip-card",
			style: {
				width: "100%",
				height: "100%",
				position: "relative",
				borderRadius: "18px",
				overflow: "hidden",
				boxShadow: "3.67px 9.17px 18.34px rgba(0, 0, 0, 0.25)",
				cursor: "pointer",
				transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
				transform: isHovered ? "scale(1.05)" : "scale(1)"
			},
			onMouseEnter: () => setIsHovered(true),
			onMouseLeave: () => setIsHovered(false),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flip-card-inner",
				style: {
					position: "relative",
					width: "100%",
					height: "100%"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flip-card-front",
					style: {
						position: "absolute",
						width: "100%",
						height: "100%",
						display: "flex",
						flexDirection: "column",
						justifyContent: "flex-end",
						alignItems: "center",
						padding: "0",
						transition: "opacity 0.4s ease-in-out",
						opacity: isHovered ? 0 : 1,
						backgroundColor: "white"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							backgroundImage: `url(${feature.image})`,
							backgroundSize: "contain",
							backgroundPosition: "center",
							backgroundRepeat: "no-repeat"
						} }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							backgroundColor: "rgba(128, 128, 128, 0.25)",
							pointerEvents: "none"
						} }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								width: "100%",
								background: "rgba(255, 255, 255, 0.95)",
								padding: "1rem 1.2rem",
								backdropFilter: "blur(10px)",
								borderBottomLeftRadius: "18px",
								borderBottomRightRadius: "18px",
								position: "relative",
								zIndex: 1
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-base font-bold text-center",
								style: {
									color: "#252d26",
									lineHeight: "1.3"
								},
								children: feature.title
							})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flip-card-back",
					style: {
						position: "absolute",
						width: "100%",
						height: "100%",
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
						backgroundColor: feature.bgColor,
						padding: "1.5rem 1.2rem",
						transition: "opacity 0.4s ease-in-out",
						opacity: isHovered ? 1 : 0,
						pointerEvents: isHovered ? "auto" : "none"
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-center leading-relaxed",
						style: {
							color: "#252d26",
							fontWeight: 500
						},
						children: feature.description
					})
				})]
			})
		})
	});
}
function NewFeaturesSection() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "features",
		className: "py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-7xl mx-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
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
					className: "text-center mb-8 sm:mb-12 ",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "inline-block bg-[#2FAC0C]/10 px-4 py-2 rounded-full mb-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[#2FAC0C] text-sm font-semibold uppercase tracking-wider",
								children: "Powerful Features"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-3xl sm:text-4xl lg:text-5xl font-black text-[#252d26] mb-4",
							children: [
								"Everything You Need to ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", { className: "hidden sm:block" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C]",
									children: "Protect Your Grain"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-lg sm:text-xl text-[#404F44] max-w-3xl mx-auto",
							children: "Comprehensive grain storage management with enterprise-grade monitoring and AI-powered insights"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "technologies-grid",
					style: {
						display: "flex",
						flexWrap: "wrap",
						justifyContent: "center",
						gap: "45px",
						maxWidth: "1100px",
						margin: "0 auto"
					},
					children: features.map((feature, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlipCard, {
						feature,
						index
					}, feature.title))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
					initial: {
						opacity: 0,
						y: 20
					},
					whileInView: {
						opacity: 1,
						y: 0
					},
					viewport: { once: true },
					transition: {
						duration: .6,
						delay: .5
					},
					className: "text-center mt-10 sm:mt-12",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[#404F44] mb-6 text-lg",
						children: "Ready to see GrainHero in action?"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col sm:flex-row gap-4 justify-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								window.location.href = "/checkout";
							},
							className: "bg-[#2FAC0C] text-white font-bold px-8 py-3.5 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105",
							children: "View Plans & Pricing"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" });
							},
							className: "bg-transparent border-2 border-[#2FAC0C] text-[#2FAC0C] font-semibold px-8 py-3.5 rounded-full hover:bg-[#2FAC0C]/10 transition-all duration-300 hover:scale-105",
							children: "Learn More"
						})]
					})]
				})
			]
		})
	});
}
var steps = [
	{
		number: "01",
		icon: Wrench,
		title: "Install IoT Sensors",
		description: "Quick and easy setup in your storage facility. Our weatherproof sensors mount in minutes and connect wirelessly to your network.",
		details: [
			"Temperature sensors",
			"Humidity monitors",
			"Moisture detectors",
			"CO₂ level sensors"
		],
		image: "/images/how-it-works/Step-01.jpg"
	},
	{
		number: "02",
		icon: Wifi,
		title: "Connect to Platform",
		description: "Sensors automatically sync with our cloud platform via Wi-Fi or cellular connection. Real-time data streams to your dashboard instantly.",
		details: [
			"Automatic cloud sync",
			"Secure encryption",
			"Mobile & web access",
			"Instant notifications"
		],
		image: "/images/how-it-works/Step-02.jpg"
	},
	{
		number: "03",
		icon: ChartLine,
		title: "Monitor & Optimize",
		description: "AI analyzes your data 24/7, predicting issues before they occur. Get actionable insights and automated alerts to protect your grain.",
		details: [
			"AI predictions",
			"Real-time alerts",
			"Historical analytics",
			"Automated reports"
		],
		image: "/images/features/Analytics_Dashboard.png"
	}
];
function NewHowItWorks() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "how-it-works",
		className: "py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-20 right-20 w-72 h-72 bg-[#2FAC0C]/5 rounded-full blur-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute bottom-20 left-20 w-96 h-96 bg-[#2FAC0C]/5 rounded-full blur-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "max-w-7xl mx-auto relative z-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
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
						className: "text-center mb-10 sm:mb-12",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "inline-block bg-[#2FAC0C]/10 px-4 py-2 rounded-full mb-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C] text-sm font-semibold uppercase tracking-wider",
									children: "Simple Setup Process"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
								className: "text-3xl sm:text-4xl lg:text-5xl font-black text-[#252d26] mb-4",
								children: ["Get Started in ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C]",
									children: "3 Simple Steps"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-lg sm:text-xl text-[#404F44] max-w-3xl mx-auto",
								children: "From installation to optimization in less than 2 hours"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-12 sm:space-y-16",
						children: steps.map((step, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
							initial: {
								opacity: 0,
								x: index % 2 === 0 ? -50 : 50
							},
							whileInView: {
								opacity: 1,
								x: 0
							},
							viewport: { once: true },
							transition: {
								duration: .6,
								delay: index * .2
							},
							className: `flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-8 lg:gap-12`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-4",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-6xl sm:text-7xl font-black text-[#2FAC0C]",
											children: step.number
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "bg-[#2FAC0C]/10 p-4 rounded-xl",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(step.icon, { className: "w-8 h-8 text-[#2FAC0C]" })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-2xl sm:text-3xl font-black text-[#252d26]",
										children: step.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[#404F44] text-lg leading-relaxed",
										children: step.description
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "space-y-2 pt-2",
										children: step.details.map((detail, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
											className: "flex items-center gap-2 text-[#404F44]",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "w-5 h-5 text-[#2FAC0C] flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: detail })]
										}, idx))
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex-1 w-full max-w-md",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "aspect-square bg-white rounded-2xl flex items-center justify-center border-2 border-[#2FAC0C]/20 shadow-lg overflow-hidden",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: step.image,
										alt: step.title,
										className: "w-full h-full object-cover",
										style: step.number === "01" ? {
											width: "85%",
											height: "85%",
											objectFit: "contain"
										} : {},
										onError: (e) => {
											e.currentTarget.style.display = "none";
											const parent = e.currentTarget.parentElement;
											if (parent) parent.classList.add("bg-gradient-to-br", "from-[#2FAC0C]/10", "to-[#2FAC0C]/5");
										}
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(step.icon, { className: "hidden w-24 h-24 text-[#2FAC0C]/30" })]
								})
							})]
						}, step.number))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
						initial: {
							opacity: 0,
							y: 20
						},
						whileInView: {
							opacity: 1,
							y: 0
						},
						viewport: { once: true },
						transition: {
							duration: .6,
							delay: .4
						},
						className: "text-center mt-10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								window.location.href = "/checkout";
							},
							className: "bg-[#2FAC0C] text-white font-bold px-10 py-4 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105",
							children: "View Plans & Pricing"
						})
					})
				]
			})
		]
	});
}
var benefits = [
	{
		icon: TrendingDown,
		title: "Reduce Grain Losses",
		description: "Prevent up to 30% of spoilage with AI-powered predictive analytics that detect issues before they become critical.",
		stat: "30%",
		statLabel: "Loss Reduction"
	},
	{
		icon: Clock,
		title: "Save Time Daily",
		description: "Automated 24/7 monitoring eliminates manual checks. Spend less time worrying and more time growing your business.",
		stat: "24/7",
		statLabel: "Auto Monitoring"
	},
	{
		icon: DollarSign,
		title: "Increase Profits",
		description: "Optimize storage conditions to maintain grain quality longer, commanding premium prices at market.",
		stat: "+25%",
		statLabel: "Profit Increase"
	},
	{
		icon: Shield,
		title: "Peace of Mind",
		description: "Real-time alerts notify you instantly of any issues. Sleep soundly knowing your harvest is protected.",
		stat: "99.9%",
		statLabel: "Uptime"
	},
	{
		icon: Zap,
		title: "Quick ROI",
		description: "Most customers see return on investment within the first harvest season from reduced losses alone.",
		stat: "6mo",
		statLabel: "Avg. ROI"
	},
	{
		icon: ArrowUpRight,
		title: "Scale Easily",
		description: "Start with one silo and expand to manage multiple locations from a single dashboard as you grow.",
		stat: "∞",
		statLabel: "Scalability"
	}
];
function BenefitsSection() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-7xl mx-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
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
					className: "text-center mb-8 sm:mb-12",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "text-3xl sm:text-4xl lg:text-5xl font-black text-[#252d26] mb-4",
						children: ["Why Farmers Trust ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[#2FAC0C]",
							children: "GrainHero"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-lg sm:text-xl text-[#404F44] max-w-3xl mx-auto",
						children: "Join thousands of grain operators who have transformed their storage operations with intelligent monitoring"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8",
					children: benefits.map((benefit, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
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
						className: "bg-white rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-[#2FAC0C]/10 hover:border-[#2FAC0C]/30 hover:scale-105 group",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-start mb-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-[#2FAC0C]/10 p-3 rounded-xl group-hover:bg-[#2FAC0C]/20 transition-colors",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(benefit.icon, { className: "w-6 h-6 text-[#2FAC0C]" })
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-xl font-bold text-[#252d26] mb-2",
								children: benefit.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[#404F44] text-sm leading-relaxed",
								children: benefit.description
							})
						]
					}, benefit.title))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
					initial: {
						opacity: 0,
						y: 20
					},
					whileInView: {
						opacity: 1,
						y: 0
					},
					viewport: { once: true },
					transition: {
						duration: .6,
						delay: .4
					},
					className: "text-center mt-10",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							window.location.href = "/checkout";
						},
						className: "bg-[#2FAC0C] text-white font-bold px-10 py-4 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105",
						children: "View Plans & Pricing"
					})
				})
			]
		})
	});
}
var techFeatures = [
	{
		icon: Cpu,
		title: "IoT Sensor Network",
		description: "Advanced sensors monitor temperature, humidity, CO₂ levels, and moisture content in real-time."
	},
	{
		icon: Brain,
		title: "Machine Learning AI",
		description: "Predictive algorithms analyze patterns to forecast spoilage risks before they occur."
	},
	{
		icon: Cloud,
		title: "Cloud Platform",
		description: "Secure cloud infrastructure ensures your data is always accessible from anywhere."
	},
	{
		icon: Smartphone,
		title: "Mobile & Web Apps",
		description: "Monitor your silos on-the-go with intuitive mobile and web applications."
	},
	{
		icon: Wifi,
		title: "Real-Time Sync",
		description: "Low-latency data transmission ensures you always have the latest information."
	},
	{
		icon: Zap,
		title: "Automated Control",
		description: "Integrate with ventilation and cooling systems for automated climate control."
	}
];
function TechnologySection() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "technology",
		className: "py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#252d26] relative overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "absolute inset-0 opacity-5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
				backgroundImage: "radial-gradient(circle at 2px 2px, rgba(47,172,12,0.4) 1px, transparent 0)",
				backgroundSize: "40px 40px",
				width: "100%",
				height: "100%"
			} })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-7xl mx-auto relative z-10",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
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
				className: "text-center mb-8 sm:mb-12",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "inline-block bg-[#2FAC0C]/10 px-4 py-2 rounded-full mb-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[#2FAC0C] text-sm font-semibold uppercase tracking-wider",
							children: "Cutting-Edge Technology"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "text-3xl sm:text-4xl lg:text-5xl font-black text-[#EDE9D4] mb-4",
						children: ["Powered by Advanced ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[#2FAC0C]",
							children: "IoT & AI"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-lg sm:text-xl text-[#EDE9D4]/70 max-w-3xl mx-auto",
						children: "Enterprise-grade technology designed specifically for grain storage management"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8",
				children: techFeatures.map((feature, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
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
					className: "bg-[#252d26]/50 backdrop-blur-sm border border-[#2FAC0C]/20 rounded-2xl p-6 hover:border-[#2FAC0C]/50 transition-all duration-300 hover:transform hover:-translate-y-2 hover:scale-105 group",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "bg-[#2FAC0C]/10 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#2FAC0C]/20 transition-colors",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(feature.icon, { className: "w-7 h-7 text-[#2FAC0C]" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-xl font-bold text-[#EDE9D4] mb-2",
							children: feature.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[#EDE9D4]/70 text-sm leading-relaxed",
							children: feature.description
						})
					]
				}, feature.title))
			})]
		})]
	});
}
function StatsSection() {
	const [isVisible, setIsVisible] = (0, import_react.useState)(false);
	const stats = [
		{
			value: 1e4,
			suffix: "+",
			label: "Tons Monitored",
			icon: TrendingUp
		},
		{
			value: 99.2,
			suffix: "%",
			label: "Prediction Accuracy",
			icon: Cpu
		},
		{
			value: 50,
			suffix: "%",
			label: "Loss Reduction",
			icon: Shield
		},
		{
			value: 24,
			suffix: "/7",
			label: "Uptime Guarantee",
			icon: Zap
		}
	];
	(0, import_react.useEffect)(() => {
		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) setIsVisible(true);
		}, { threshold: .2 });
		const el = document.getElementById("stats-section");
		if (el) observer.observe(el);
		return () => observer.disconnect();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "stats-section",
		className: "relative py-10 sm:py-16 overflow-hidden",
		style: { background: "linear-gradient(135deg, #2FAC0C 0%, #2FAC0C 40%, #252d26 100%)" },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "absolute inset-0 opacity-10",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
				backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)",
				backgroundSize: "40px 40px",
				width: "100%",
				height: "100%"
			} })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "container mx-auto px-4 sm:px-8 lg:px-12 relative z-10 max-w-7xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-center mb-6 sm:mb-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: `text-2xl sm:text-5xl lg:text-6xl font-black leading-tight text-white transform transition-all duration-1000 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"}`,
					children: "Numbers That Matter"
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8",
				children: stats.map((stat, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
					initial: {
						opacity: 0,
						y: 40
					},
					animate: isVisible ? {
						opacity: 1,
						y: 0
					} : {},
					transition: {
						delay: index * .15 + .3,
						duration: .6
					},
					className: "relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-8 text-center hover:bg-white/15 transition-all duration-300 group",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(stat.icon, { className: "w-4 h-4 sm:w-6 sm:h-6 text-white" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-1 sm:mb-2",
							children: isVisible ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatedNumber, {
								value: stat.value,
								suffix: stat.suffix
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["0", stat.suffix] })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-white/80 font-medium text-xs sm:text-base",
							children: stat.label
						})
					]
				}, stat.label))
			})]
		})]
	});
}
function AnimatedNumber({ value, suffix }) {
	const [count, setCount] = (0, import_react.useState)(0);
	const isDecimal = value % 1 !== 0;
	(0, import_react.useEffect)(() => {
		const duration = 4e3;
		const startTime = Date.now();
		const timer = setInterval(() => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3);
			setCount(eased * value);
			if (progress >= 1) clearInterval(timer);
		}, 16);
		return () => clearInterval(timer);
	}, [value]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [isDecimal ? count.toFixed(1) : Math.floor(count).toLocaleString(), suffix] });
}
var faqs = [
	{
		question: "How does the AI predict grain spoilage?",
		answer: "Our machine learning algorithms analyze historical data from thousands of silos, combining temperature, humidity, moisture content, and CO₂ levels. The AI identifies patterns that precede spoilage and alerts you 24-48 hours before issues become critical, giving you time to take preventive action."
	},
	{
		question: "What sensors are included in the system?",
		answer: "Each GrainHero kit includes temperature sensors, humidity monitors, moisture detectors, and CO₂ level sensors. All sensors are industrial-grade, weatherproof, and designed specifically for grain storage environments. Installation takes less than 2 hours with our guided setup."
	},
	{
		question: "Can I monitor multiple silos or locations?",
		answer: "Yes! GrainHero supports unlimited silos and multiple locations on a single dashboard. You can switch between facilities instantly, set location-specific alerts, and generate comparative reports across all your storage sites."
	},
	{
		question: "Is there a mobile app available?",
		answer: "Absolutely. GrainHero offers native mobile apps for both iOS and Android, plus a responsive web application. Access real-time data, receive push notifications, and control your systems from anywhere in the world."
	},
	{
		question: "What is the installation process like?",
		answer: "Installation is straightforward: mount sensors in your silos, connect to power and Wi-Fi, and activate through our app. Most customers complete setup in under 2 hours. We provide video tutorials, and our support team offers live assistance if needed."
	},
	{
		question: "Do you offer training and support?",
		answer: "Yes! Every plan includes comprehensive onboarding, video tutorials, and 24/7 customer support. Professional and Enterprise plans include personalized training sessions and a dedicated account manager to ensure your success."
	},
	{
		question: "What happens if internet connectivity is lost?",
		answer: "Our sensors have local storage that buffers data for up to 7 days. When connectivity is restored, all data syncs automatically. Critical alerts can also be delivered via SMS to ensure you never miss important notifications."
	},
	{
		question: "How accurate are the spoilage predictions?",
		answer: "Our AI maintains a 95% accuracy rate in predicting spoilage events 24-48 hours in advance. The system continuously learns from your specific storage conditions, improving accuracy over time for your unique environment."
	}
];
function FAQSection() {
	const [openIndex, setOpenIndex] = (0, import_react.useState)(null);
	const toggleFAQ = (index) => {
		setOpenIndex(openIndex === index ? null : index);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "faq",
		className: "py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-4xl mx-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
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
					className: "text-center mb-8 sm:mb-12",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "text-3xl sm:text-4xl lg:text-5xl font-black text-[#252d26] mb-4",
						children: ["Frequently Asked ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[#2FAC0C]",
							children: "Questions"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-lg text-[#404F44]",
						children: "Everything you need to know about GrainHero"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-4",
					children: faqs.map((faq, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
						initial: {
							opacity: 0,
							y: 20
						},
						whileInView: {
							opacity: 1,
							y: 0
						},
						viewport: { once: true },
						transition: {
							duration: .4,
							delay: index * .05
						},
						className: "bg-white rounded-xl shadow-sm border border-[#2FAC0C]/10 overflow-hidden hover:scale-105 transition-transform duration-300",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => toggleFAQ(index),
							className: "w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#2FAC0C]/5 transition-colors",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[#252d26] font-bold text-base sm:text-lg pr-4",
								children: faq.question
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `flex-shrink-0 w-8 h-8 rounded-full bg-[#2FAC0C]/10 flex items-center justify-center transition-transform duration-300 ${openIndex === index ? "rotate-180" : ""}`,
								children: openIndex === index ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "w-5 h-5 text-[#2FAC0C]" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-5 h-5 text-[#2FAC0C]" })
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: openIndex === index && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
							initial: {
								height: 0,
								opacity: 0
							},
							animate: {
								height: "auto",
								opacity: 1
							},
							exit: {
								height: 0,
								opacity: 0
							},
							transition: {
								duration: .3,
								ease: "easeInOut"
							},
							className: "overflow-hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "px-6 pb-5 text-[#404F44] leading-relaxed",
								children: faq.answer
							})
						}) })]
					}, index))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
					initial: {
						opacity: 0,
						y: 20
					},
					whileInView: {
						opacity: 1,
						y: 0
					},
					viewport: { once: true },
					transition: {
						duration: .6,
						delay: .3
					},
					className: "mt-10 text-center p-8 bg-white rounded-2xl border border-[#2FAC0C]/20",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-xl font-bold text-[#252d26] mb-2",
							children: "Still have questions?"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[#404F44] mb-4",
							children: "Our team is here to help you get started"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								window.location.href = "/contact";
							},
							className: "bg-[#2FAC0C] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105",
							children: "Contact Support"
						})
					]
				})
			]
		})
	});
}
function NewCTASection() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "relative py-14 sm:py-20 overflow-hidden bg-[#252d26]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 opacity-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
					backgroundImage: "radial-gradient(circle at 2px 2px, rgba(47,172,12,0.4) 1px, transparent 0)",
					backgroundSize: "40px 40px",
					width: "100%",
					height: "100%"
				} })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-1/4 left-1/4 w-96 h-96 bg-[#2FAC0C]/10 rounded-full blur-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute bottom-0 right-1/4 w-64 h-64 bg-[#2FAC0C]/10 rounded-full blur-2xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "container mx-auto px-4 text-center relative z-10 max-w-5xl",
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
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "inline-block bg-[#2FAC0C]/10 px-4 py-2 rounded-full mb-6",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[#2FAC0C] text-sm font-semibold uppercase tracking-wider",
								children: "Start Today"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6 leading-tight",
							children: [
								"Ready to Optimize Your",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C]",
									children: "Grain Storage?"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xl text-[#EDE9D4]/70 mb-10 max-w-3xl mx-auto leading-relaxed",
							children: "Join thousands of farmers and grain operators who trust GrainHero to protect their harvest and maximize profits with AI-powered monitoring."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col sm:flex-row gap-4 justify-center items-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/checkout",
								className: "group bg-[#2FAC0C] text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-[#2FAC0C]/90 transition-all duration-300 cursor-pointer shadow-2xl hover:shadow-[#2FAC0C]/30 hover:scale-105 flex items-center gap-2",
								children: ["View Plans & Pricing", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "w-5 h-5 group-hover:translate-x-1 transition-transform" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									window.location.href = "mailto:grainhero@gmail.com?subject=Schedule Demo Request";
								},
								className: "bg-transparent border-2 border-[#EDE9D4]/30 text-[#EDE9D4] px-10 py-4 rounded-full text-lg font-semibold hover:bg-[#EDE9D4]/10 hover:border-[#EDE9D4] transition-all duration-300 hover:scale-105",
								children: "Schedule Demo"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.p, {
							initial: { opacity: 0 },
							whileInView: { opacity: 1 },
							viewport: { once: true },
							transition: { delay: .4 },
							className: "text-[#EDE9D4]/50 text-sm mt-8",
							children: "Trusted by 10,000+ farmers worldwide"
						})
					]
				})
			})
		]
	});
}
function NewHomePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "min-h-screen bg-[#EDE9D4] text-[#404F44]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewGlassNav, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "hero",
				"aria-label": "Hero section",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewHeroSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "features",
				"aria-label": "Features section",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewFeaturesSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "how-it-works",
				"aria-label": "How it works",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewHowItWorks, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "benefits",
				"aria-label": "Benefits",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BenefitsSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "technology",
				"aria-label": "Technology",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TechnologySection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				"aria-label": "Statistics",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatsSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "pricing",
				"aria-label": "Pricing",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PricingShowcase, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "faq",
				"aria-label": "FAQ",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FAQSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				"aria-label": "Call to action",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewCTASection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewFooter, {})
		]
	});
}
function PricingShowcase() {
	const [selectedPlanId, setSelectedPlanId] = (0, import_react.useState)(pricingData[0]?.id ?? null);
	const [activeSlide, setActiveSlide] = (0, import_react.useState)(0);
	const [isMobile, setIsMobile] = (0, import_react.useState)(false);
	const [isVisible, setIsVisible] = (0, import_react.useState)(false);
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
		const el = document.getElementById("pricing");
		if (el) observer.observe(el);
		return () => observer.disconnect();
	}, []);
	const nextSlide = (0, import_react.useCallback)(() => {
		setActiveSlide((prev) => (prev + 1) % pricingData.length);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!isMobile || !isVisible) return;
		const timer = setInterval(nextSlide, 4500);
		return () => clearInterval(timer);
	}, [
		isMobile,
		isVisible,
		nextSlide
	]);
	const plans = pricingData;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "pricing",
		className: "py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-7xl mx-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
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
					className: "text-center mb-8 sm:mb-10",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "inline-block bg-[#2FAC0C]/10 px-4 py-2 rounded-full mb-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[#2FAC0C] text-sm font-semibold uppercase tracking-wider",
								children: "Flexible Pricing"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "text-3xl sm:text-5xl lg:text-6xl font-black text-[#252d26] mb-4",
							children: [
								"Pick the Plan That ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", { className: "hidden sm:block" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C]",
									children: "Checks Your Boxes"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-lg text-[#404F44] max-w-2xl mx-auto",
							children: "Choose the perfect plan for your operation. Scale up or down anytime."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "md:hidden max-w-sm mx-auto",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative h-[500px]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
							mode: "wait",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
								initial: {
									opacity: 0,
									x: 60,
									scale: .95
								},
								animate: {
									opacity: 1,
									x: 0,
									scale: 1
								},
								exit: {
									opacity: 0,
									x: -60,
									scale: .95
								},
								transition: {
									duration: .4,
									ease: "easeInOut"
								},
								className: "absolute inset-0",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PricingCard, {
									p: plans[activeSlide],
									isSelected: selectedPlanId === plans[activeSlide].id,
									setSelectedPlanId
								})
							}, activeSlide)
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex justify-center gap-2 mt-6",
						children: plans.map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setActiveSlide(i),
							className: `w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${i === activeSlide ? "bg-[#2FAC0C] scale-125" : "bg-[#404F44]/30"}`,
							"aria-label": `View plan ${i + 1}`
						}, i))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "hidden md:flex flex-wrap justify-center gap-6",
					children: plans.map((p, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
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
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PricingCard, {
							p,
							isSelected: selectedPlanId === p.id,
							setSelectedPlanId
						})
					}, p.id))
				})
			]
		})
	});
}
function PricingCard({ p, isSelected, setSelectedPlanId }) {
	const priceText = p.priceFrontend ?? `Rs. ${p.price?.toLocaleString()}${p.duration ?? ""}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: `cursor-pointer text-left w-full h-full max-w-sm rounded-2xl bg-white border-2 p-7 shadow-sm transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:scale-105 block ${isSelected ? "border-[#2FAC0C] ring-2 ring-[#2FAC0C]/20 shadow-xl" : "border-[#2FAC0C]/20 hover:border-[#2FAC0C]/60"} ${p.popular ? "relative overflow-hidden" : ""}`,
		children: [
			p.popular && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute top-0 right-0 bg-[#2FAC0C] text-white text-xs font-bold px-3 py-1 rounded-bl-lg",
				children: "POPULAR"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-br from-[#2FAC0C]/5 to-transparent pointer-events-none" })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "radio",
				name: "landing-plan",
				value: p.id,
				checked: isSelected,
				onChange: () => setSelectedPlanId(p.id),
				className: "sr-only"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: "text-xl font-bold text-[#252d26] mb-2",
						children: p.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-3xl font-black text-[#2FAC0C] mb-2",
						children: priceText
					}),
					p.iotChargeLabel && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1.5 text-xs font-medium text-[#2FAC0C] bg-[#2FAC0C]/10 border border-[#2FAC0C]/20 rounded-lg px-3 py-1.5 mb-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { className: "w-3.5 h-3.5 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.iotChargeLabel })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[#404F44] text-sm mb-5",
						children: p.description
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-2.5 text-sm text-[#404F44] mb-6",
						children: p.features.map((f, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-start gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-4 h-4 text-[#2FAC0C] flex-shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: f })]
						}, idx))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/checkout",
						onClick: () => {
							try {
								localStorage.setItem("selectedPlanId", p.id);
							} catch {}
						},
						className: `mt-auto inline-block w-full text-center py-3 rounded-full font-bold transition-all duration-300 hover:scale-105 ${isSelected ? "bg-[#2FAC0C] text-white hover:bg-[#2FAC0C]/90 shadow-lg" : "border-2 border-[#2FAC0C]/30 text-[#2FAC0C] hover:border-[#2FAC0C] hover:bg-[#2FAC0C]/10"}`,
						children: p.id === "custom" ? "Contact Us" : "Choose Plan"
					})
				]
			})
		]
	});
}
//#endregion
export { NewHomePage as component };
