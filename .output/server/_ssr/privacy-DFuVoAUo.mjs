import { t as motion } from "../_libs/framer-motion.mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { I as Shield, Mt as Eye, Ot as FileText, g as UserCheck, mt as Lock, zt as Database } from "../_libs/lucide-react.mjs";
import { n as NewGlassNav, t as NewFooter } from "./NewFooter-BNo3iHuN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/privacy-DFuVoAUo.js
var import_jsx_runtime = require_jsx_runtime();
function PrivacyPolicyPage() {
	const sections = [
		{
			icon: Database,
			title: "Information We Collect",
			description: "We collect various types of information to provide and improve our grain storage monitoring services. Our data collection practices are transparent and focused on delivering value to you.",
			points: [
				"Personal information including name, email address, and company details",
				"Account credentials and authentication information",
				"Sensor data from your grain storage monitoring systems",
				"Temperature, humidity, and environmental readings from connected devices",
				"Usage data and analytics to improve our services",
				"Communication preferences and support interactions"
			]
		},
		{
			icon: Eye,
			title: "How We Use Your Information",
			description: "Your information enables us to deliver, maintain, and enhance our grain storage monitoring platform. We are committed to using your data responsibly and only for legitimate business purposes.",
			points: [
				"Provide real-time monitoring and predictive analytics for grain storage",
				"Send technical notices, updates, and security alerts",
				"Process your requests and provide customer support",
				"Improve and personalize our services based on usage patterns",
				"Protect against fraudulent or illegal activity",
				"Generate insights and reports for your grain storage operations"
			]
		},
		{
			icon: Lock,
			title: "Data Security",
			description: "We implement comprehensive security measures to protect your information from unauthorized access, disclosure, alteration, and destruction.",
			points: [
				"Industry-standard encryption for all data transmission (TLS/SSL)",
				"Secure data centers with physical and digital access controls",
				"Regular security audits and vulnerability assessments",
				"SOC 2 Type II compliance for data security standards",
				"Employee training on data protection and privacy practices",
				"Incident response procedures and breach notification protocols"
			]
		},
		{
			icon: UserCheck,
			title: "Your Privacy Rights",
			description: "We respect your rights regarding your personal information and provide tools to help you control your data.",
			points: [
				"Access your personal information at any time through your account",
				"Correct or update inaccurate information",
				"Export your data in a portable format",
				"Request deletion of your account and associated data",
				"Opt-out of marketing communications",
				"Object to certain data processing activities"
			]
		},
		{
			icon: Shield,
			title: "Data Retention",
			description: "We retain your information only as long as necessary to provide our services and comply with legal obligations.",
			points: [
				"Active account data retained for the duration of service use",
				"Sensor data and analytics retained for 24 months for historical analysis",
				"Deleted account data removed within 30 days of deletion request",
				"Backup copies retained for up to 90 days for disaster recovery",
				"Legal compliance data retained as required by applicable laws",
				"You can request early deletion of your data at any time"
			]
		},
		{
			icon: FileText,
			title: "Third-Party Services",
			description: "We partner with trusted service providers to deliver our platform. All third parties are carefully vetted and contractually bound to protect your data.",
			points: [
				"Cloud hosting providers for secure infrastructure",
				"Analytics services for platform improvement",
				"Payment processors for billing and subscriptions",
				"Email service providers for communications",
				"Customer support and ticketing systems",
				"All providers maintain strict data protection agreements"
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
									children: "Privacy Policy"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6",
								children: ["Your Privacy ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C]",
									children: "Matters"
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
							children: "At GrainHero, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our grain storage monitoring platform. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the platform."
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
								children: "Questions About Privacy?"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-lg text-[#404F44] mb-6",
								children: "If you have questions or concerns about this Privacy Policy, please contact our privacy team."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "mailto:grainhero@gmail.com",
								className: "inline-block bg-[#2FAC0C] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#2FAC0C]/90 hover:scale-105 transition-all",
								children: "Contact Privacy Team"
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
export { PrivacyPolicyPage as component };
