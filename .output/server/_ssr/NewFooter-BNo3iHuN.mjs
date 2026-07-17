import { o as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { _ as Twitter, et as Phone, ft as Mail, gt as Linkedin, jt as Facebook, n as X, s as Wheat, ut as Menu, yt as Instagram } from "../_libs/lucide-react.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/NewFooter-BNo3iHuN.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var navLinks = [
	{
		href: "/",
		label: "Home"
	},
	{
		href: "/about",
		label: "About"
	},
	{
		href: "/team",
		label: "Team"
	},
	{
		href: "/contact",
		label: "Contact"
	},
	{
		href: "/blog",
		label: "Blog"
	}
];
function NewGlassNav() {
	const [isScrolled, setIsScrolled] = (0, import_react.useState)(false);
	const [isVisible, setIsVisible] = (0, import_react.useState)(true);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let lastScrollY = window.scrollY;
		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			setIsScrolled(currentScrollY > 50);
			if (currentScrollY > lastScrollY && currentScrollY > 150) setIsVisible(false);
			else setIsVisible(true);
			lastScrollY = currentScrollY;
		};
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);
	(0, import_react.useEffect)(() => {
		document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [isMobileMenuOpen]);
	const handleAnchorClick = (e, href) => {
		if (href.startsWith("#")) {
			e.preventDefault();
			setIsMobileMenuOpen(false);
			setTimeout(() => {
				document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
			}, 100);
		} else setIsMobileMenuOpen(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.nav, {
		initial: "hidden",
		animate: isVisible ? "visible" : "hidden",
		variants: {
			visible: {
				opacity: 1,
				y: 0,
				transition: {
					duration: .4,
					ease: [
						.22,
						1,
						.36,
						1
					]
				}
			},
			hidden: {
				opacity: 0,
				y: -20,
				transition: {
					duration: .3,
					ease: [
						.55,
						.085,
						.68,
						.53
					]
				}
			}
		},
		className: "fixed top-0 left-0 right-0 w-full z-[110]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `w-full px-4 sm:px-8 lg:px-12 py-3 sm:py-4 transition-all duration-300 ease-out ${isScrolled ? "bg-[#252d26]/95 backdrop-blur-md shadow-lg" : "bg-transparent"}`,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between max-w-7xl mx-auto",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/",
						className: "flex items-center gap-2 cursor-pointer",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "w-6 h-6 sm:w-8 sm:h-8 text-[#2FAC0C]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[#EDE9D4] text-lg sm:text-xl font-bold tracking-wide",
							children: "GrainHero"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "hidden md:flex items-center space-x-6 lg:space-x-8",
						children: navLinks.map((link) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: link.href,
							onClick: (e) => handleAnchorClick(e, link.href),
							className: "text-[#EDE9D4]/90 hover:text-[#EDE9D4] font-medium transition-all duration-300 hover:scale-105 text-sm tracking-wide relative group",
							children: [link.label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute -bottom-1 left-0 w-0 h-0.5 bg-[#2FAC0C] group-hover:w-full transition-all duration-300" })]
						}, link.href))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center space-x-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/auth/login",
								className: "hidden sm:inline-block text-[#EDE9D4]/90 hover:text-[#EDE9D4] font-medium transition-colors text-sm",
								children: "Login"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/checkout",
								className: "hidden sm:inline-block bg-[#2FAC0C] text-white font-semibold px-5 py-2.5 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 text-sm shadow-lg hover:shadow-xl hover:scale-105",
								children: "Get Started"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setIsMobileMenuOpen(true),
								className: "md:hidden text-[#EDE9D4] p-2 cursor-pointer hover:text-[#2FAC0C] transition-colors",
								"aria-label": "Open menu",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "w-7 h-7" })
							})
						]
					})
				]
			})
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: isMobileMenuOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: .3 },
		className: "md:hidden fixed inset-0 z-[3000] bg-[#252d26]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute top-6 right-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setIsMobileMenuOpen(false),
					className: "text-[#EDE9D4] p-2 hover:text-[#2FAC0C] transition-colors",
					"aria-label": "Close menu",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-8 h-8" })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/",
				className: "absolute top-6 left-6 flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "w-7 h-7 text-[#2FAC0C]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[#EDE9D4] text-xl font-bold",
					children: "GrainHero"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center justify-center h-full space-y-6",
				children: [navLinks.map((link, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.a, {
					href: link.href,
					initial: {
						opacity: 0,
						y: 20
					},
					animate: {
						opacity: 1,
						y: 0
					},
					transition: { delay: .1 + i * .08 },
					onClick: (e) => {
						handleAnchorClick(e, link.href);
						setIsMobileMenuOpen(false);
					},
					className: "text-[#EDE9D4] text-2xl font-medium hover:text-[#2FAC0C] transition-colors",
					children: link.label
				}, link.href)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
					initial: {
						opacity: 0,
						y: 20
					},
					animate: {
						opacity: 1,
						y: 0
					},
					transition: { delay: .5 },
					className: "pt-6 flex flex-col space-y-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/auth/login",
						onClick: () => setIsMobileMenuOpen(false),
						className: "text-[#EDE9D4] text-xl font-medium hover:text-[#2FAC0C] transition-colors text-center",
						children: "Login"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/checkout",
						onClick: () => setIsMobileMenuOpen(false),
						className: "bg-[#2FAC0C] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#2FAC0C]/90 transition-all text-center",
						children: "Get Started"
					})]
				})]
			})
		]
	}) })] });
}
function NewFooter() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
		className: "bg-[#252d26] text-[#EDE9D4] pt-16 pb-8 px-4 sm:px-6 lg:px-8",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-7xl mx-auto",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "w-8 h-8 text-[#2FAC0C]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xl font-bold text-[#EDE9D4]",
									children: "GrainHero"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[#EDE9D4]/70 text-sm leading-relaxed",
								children: "AI-powered grain storage management platform helping farmers protect their harvest and maximize profits with intelligent monitoring and predictive analytics."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-3 pt-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: "https://facebook.com",
										target: "_blank",
										rel: "noopener noreferrer",
										className: "w-10 h-10 bg-[#EDE9D4]/10 hover:bg-[#2FAC0C] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110",
										"aria-label": "Facebook",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Facebook, { className: "w-5 h-5" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: "https://twitter.com",
										target: "_blank",
										rel: "noopener noreferrer",
										className: "w-10 h-10 bg-[#EDE9D4]/10 hover:bg-[#2FAC0C] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110",
										"aria-label": "Twitter",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Twitter, { className: "w-5 h-5" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: "https://www.linkedin.com/in/grain-hero-841723419/",
										target: "_blank",
										rel: "noopener noreferrer",
										className: "w-10 h-10 bg-[#EDE9D4]/10 hover:bg-[#2FAC0C] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110",
										"aria-label": "LinkedIn",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Linkedin, { className: "w-5 h-5" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: "https://instagram.com",
										target: "_blank",
										rel: "noopener noreferrer",
										className: "w-10 h-10 bg-[#EDE9D4]/10 hover:bg-[#2FAC0C] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110",
										"aria-label": "Instagram",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Instagram, { className: "w-5 h-5" })
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-[#EDE9D4] font-bold text-lg mb-4",
						children: "Product"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/#features",
								className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
								children: "Features"
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/#pricing",
								className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
								children: "Pricing"
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/#how-it-works",
								className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
								children: "How It Works"
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/#technology",
								className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
								children: "Technology"
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/#faq",
								className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
								children: "FAQ"
							}) })
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-[#EDE9D4] font-bold text-lg mb-4",
						children: "Company"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/about",
								className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
								children: "About Us"
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/team",
								className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
								children: "Team"
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/blog",
								className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
								children: "Blog"
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/contact",
								className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
								children: "Contact"
							}) })
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-[#EDE9D4] font-bold text-lg mb-4",
							children: "Support"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "space-y-3 mb-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/help",
									className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
									children: "Help Center"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/docs",
									className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
									children: "Documentation"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/privacy",
									className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
									children: "Privacy Policy"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/terms",
									className: "text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm",
									children: "Terms of Service"
								}) })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 text-[#EDE9D4]/70",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "w-4 h-4 text-[#2FAC0C]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "mailto:grainhero@gmail.com",
									className: "hover:text-[#2FAC0C] transition-colors",
									children: "grainhero@gmail.com"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 text-[#EDE9D4]/70",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "w-4 h-4 text-[#2FAC0C]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "tel:+923455904427",
									className: "hover:text-[#2FAC0C] transition-colors",
									children: "+92 345 5904427"
								})]
							})]
						})
					] })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-t border-[#EDE9D4]/10 pt-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col md:flex-row justify-between items-center gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[#EDE9D4]/50 text-sm text-center md:text-left",
						children: [
							"© ",
							(/* @__PURE__ */ new Date()).getFullYear(),
							" GrainHero. All rights reserved."
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-6 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/privacy",
								className: "text-[#EDE9D4]/50 hover:text-[#2FAC0C] transition-colors",
								children: "Privacy"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/terms",
								className: "text-[#EDE9D4]/50 hover:text-[#2FAC0C] transition-colors",
								children: "Terms"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/cookies",
								className: "text-[#EDE9D4]/50 hover:text-[#2FAC0C] transition-colors",
								children: "Cookies"
							})
						]
					})]
				})
			})]
		})
	});
}
//#endregion
export { NewGlassNav as n, NewFooter as t };
