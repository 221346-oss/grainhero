import { t as motion } from "../_libs/framer-motion.mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { $t as CircleCheckBig, G as Scale, Ot as FileText, Xt as CircleX, d as Users, en as CircleAlert } from "../_libs/lucide-react.mjs";
import { n as NewGlassNav, t as NewFooter } from "./NewFooter-BNo3iHuN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/terms-C7iwpt9a.js
var import_jsx_runtime = require_jsx_runtime();
function TermsOfServicePage() {
	const sections = [
		{
			icon: FileText,
			title: "Acceptance of Terms",
			description: "By accessing and using GrainHero, you enter into a binding agreement with us. These terms govern your use of our grain storage monitoring platform and all related services.",
			points: [
				"These terms apply to all users, customers, and service providers",
				"By creating an account, you accept these Terms of Service",
				"If you disagree with any part of these terms, you may not use our platform",
				"Continued use of the service constitutes acceptance of updated terms",
				"You must be 18 years or older to use this service",
				"Corporate accounts must be created by authorized representatives"
			]
		},
		{
			icon: Users,
			title: "User Accounts and Responsibilities",
			description: "Account security and proper use are your responsibility. We provide the tools, but you must maintain the security and accuracy of your account information.",
			points: [
				"Provide accurate, current, and complete registration information",
				"Maintain and promptly update your account information",
				"Keep your account credentials secure and confidential",
				"Notify us immediately of any unauthorized account access",
				"You are responsible for all activities under your account",
				"Do not share your account with others or create multiple accounts"
			]
		},
		{
			icon: CircleCheckBig,
			title: "Acceptable Use Policy",
			description: "Our platform is designed for legitimate grain storage monitoring. We expect all users to use our services responsibly and in accordance with applicable laws.",
			points: [
				"Use the service only for lawful purposes and legitimate business activities",
				"Do not transmit malicious code, viruses, or harmful software",
				"Do not interfere with or disrupt our services or servers",
				"Do not attempt unauthorized access to any part of our system",
				"Respect the intellectual property rights of others",
				"Comply with all applicable local, state, national, and international laws"
			]
		},
		{
			icon: Scale,
			title: "Intellectual Property Rights",
			description: "GrainHero and its content are protected by intellectual property laws. We grant you limited rights to use our platform, but ownership remains with us.",
			points: [
				"All platform content, features, and functionality are our exclusive property",
				"Protected by copyright, trademark, patent, and trade secret laws",
				"You may not reproduce, distribute, or modify our platform without permission",
				"Your sensor data and analytics remain your property",
				"We retain rights to aggregated, anonymized data for service improvement",
				"License to use our platform is non-exclusive and revocable"
			]
		},
		{
			icon: CircleAlert,
			title: "Disclaimers and Limitation of Liability",
			description: "While we strive for excellence, our service is provided as-is. Understanding these limitations is important for all users.",
			points: [
				"Service provided \"as is\" without warranties of any kind",
				"We do not guarantee uninterrupted or error-free service",
				"Not liable for indirect, incidental, or consequential damages",
				"Total liability limited to amounts paid in the past 12 months",
				"You are responsible for backup and security of your data",
				"We are not liable for third-party integrations or services"
			]
		},
		{
			icon: CircleX,
			title: "Termination and Suspension",
			description: "Either party may terminate this agreement under certain conditions. We reserve the right to suspend accounts that violate our terms.",
			points: [
				"You may cancel your subscription at any time through account settings",
				"We may suspend or terminate accounts for Terms violations",
				"Termination may be immediate for serious breaches",
				"Upon termination, your right to use the service ceases immediately",
				"We may retain certain data as required by law or legitimate business needs",
				"Fees paid are non-refundable except as required by law"
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
									children: "Terms of Service"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6",
								children: ["Terms & ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C]",
									children: "Conditions"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xl text-[#EDE9D4]/80 leading-relaxed",
								children: ["Last updated: ", (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
									year: "numeric",
									month: "long",
									day: "numeric"
								})]
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 px-4 sm:px-6 lg:px-8 bg-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-w-4xl mx-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
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
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-lg text-[#404F44] leading-relaxed",
							children: "These Terms of Service (\"Terms\") govern your access to and use of the GrainHero platform, including our website, mobile applications, and related services (collectively, the \"Service\"). By using GrainHero, you agree to these Terms. Please read them carefully."
						})
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-w-7xl mx-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid md:grid-cols-2 gap-6 lg:gap-8",
						children: sections.map((section, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
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
							className: "bg-white rounded-2xl p-6 sm:p-8 shadow-sm border-2 border-[#252d26]/10 hover:scale-105 transition-all duration-300",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-4 mb-5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-[#2FAC0C]/10 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(section.icon, { className: "w-6 h-6 text-[#2FAC0C]" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-xl font-bold text-[#252d26] mb-2",
									children: section.title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-[#404F44]/70 leading-relaxed",
									children: section.description
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-2.5",
								children: section.points.map((point, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "w-5 h-5 rounded-full bg-[#2FAC0C] flex items-center justify-center flex-shrink-0 mt-0.5",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
											className: "w-3 h-3 text-white",
											fill: "none",
											strokeLinecap: "round",
											strokeLinejoin: "round",
											strokeWidth: "2.5",
											viewBox: "0 0 24 24",
											stroke: "currentColor",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 13l4 4L19 7" })
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-[#404F44] leading-relaxed",
										children: point
									})]
								}, idx))
							})]
						}, section.title))
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 px-4 sm:px-6 lg:px-8 bg-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-w-4xl mx-auto space-y-8",
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
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-2xl font-bold text-[#252d26] mb-3",
								children: "Payment Terms"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[#404F44] leading-relaxed",
								children: "Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law. We reserve the right to change our fees with 30 days' notice."
							})]
						}),
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
							transition: {
								duration: .6,
								delay: .1
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-2xl font-bold text-[#252d26] mb-3",
								children: "Changes to Terms"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[#404F44] leading-relaxed",
								children: "We may modify these Terms at any time. We will notify you of material changes via email or through the Service. Your continued use of GrainHero after such notification constitutes acceptance of the updated Terms."
							})]
						}),
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
							transition: {
								duration: .6,
								delay: .2
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-2xl font-bold text-[#252d26] mb-3",
								children: "Governing Law"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[#404F44] leading-relaxed",
								children: "These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which GrainHero operates, without regard to its conflict of law provisions."
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]",
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
								className: "text-3xl font-black text-[#252d26] mb-4",
								children: "Questions About These Terms?"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-lg text-[#404F44] mb-6",
								children: "If you have any questions about these Terms of Service, please contact our legal team."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "mailto:grainhero@gmail.com",
								className: "inline-block bg-[#2FAC0C] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#2FAC0C]/90 hover:scale-105 transition-all",
								children: "Contact Legal Team"
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
export { TermsOfServicePage as component };
