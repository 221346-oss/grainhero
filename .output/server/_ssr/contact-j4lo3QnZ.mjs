import { o as __toESM } from "../_runtime.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { $t as CircleCheckBig, H as Send, ct as MessageSquare, dt as MapPin, en as CircleAlert, et as Phone, ft as Mail } from "../_libs/lucide-react.mjs";
import { n as NewGlassNav, t as NewFooter } from "./NewFooter-BNo3iHuN.mjs";
import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { c as stringType, o as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/contact-j4lo3QnZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var contactFormSchema = objectType({
	name: stringType().min(1, "Name is required").max(100),
	email: stringType().email("Valid email is required").max(100),
	phone: stringType().max(20).optional(),
	subject: stringType().min(1, "Subject is required").max(200),
	message: stringType().min(10, "Message must be at least 10 characters").max(2e3)
});
/**
* Send contact form email using Resend API
*/
var sendContactEmail = createServerFn({ method: "POST" }).inputValidator((data) => contactFormSchema.parse(data)).handler(createSsrRpc("73ff7f23ac0bc95d3e4fd15ae7ec969876fe6b81ab3b4eeb0aa53e41b669bd6e"));
/**
* Generate professional HTML email template
*/
/**
* Escape HTML to prevent XSS
*/
function ContactPage() {
	const [formData, setFormData] = (0, import_react.useState)({
		name: "",
		email: "",
		phone: "",
		subject: "",
		message: ""
	});
	const [isSubmitting, setIsSubmitting] = (0, import_react.useState)(false);
	const [submitStatus, setSubmitStatus] = (0, import_react.useState)("idle");
	const [errorMessage, setErrorMessage] = (0, import_react.useState)("");
	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);
		setSubmitStatus("idle");
		setErrorMessage("");
		try {
			const result = await sendContactEmail({ data: {
				name: formData.name,
				email: formData.email,
				phone: formData.phone,
				subject: formData.subject,
				message: formData.message
			} });
			if (result.success) {
				setSubmitStatus("success");
				setFormData({
					name: "",
					email: "",
					phone: "",
					subject: "",
					message: ""
				});
				setTimeout(() => {
					setSubmitStatus("idle");
				}, 5e3);
			} else {
				setSubmitStatus("error");
				setErrorMessage(result.error || "Failed to send message. Please try again.");
			}
		} catch (error) {
			console.error("Error submitting contact form:", error);
			setSubmitStatus("error");
			setErrorMessage("Failed to send message. Please email us directly at grainhero@gmail.com");
		} finally {
			setIsSubmitting(false);
		}
	};
	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		});
	};
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
									children: "Get In Touch"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6",
								children: ["Contact ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#2FAC0C]",
									children: "GrainHero"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xl text-[#EDE9D4]/80 leading-relaxed",
								children: "Have questions? We're here to help you protect your grain with smart technology."
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "py-16 sm:py-24 px-4 sm:px-6 lg:px-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-w-7xl mx-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid lg:grid-cols-2 gap-12",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
							initial: {
								opacity: 0,
								x: -30
							},
							animate: {
								opacity: 1,
								x: 0
							},
							transition: { duration: .6 },
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
									className: "text-3xl font-black text-[#252d26] mb-6",
									children: ["Let's ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[#2FAC0C]",
										children: "Connect"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[#404F44] text-lg mb-8 leading-relaxed",
									children: "Whether you're interested in our platform, need technical support, or want to explore partnership opportunities, our team is ready to assist you."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-6",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start gap-4 bg-white p-6 rounded-xl shadow-sm border border-[#2FAC0C]/10",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "bg-[#2FAC0C]/10 p-3 rounded-lg",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "w-6 h-6 text-[#2FAC0C]" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
													className: "font-bold text-[#252d26] mb-1",
													children: "Email Us"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
													href: "mailto:grainhero@gmail.com",
													className: "text-[#404F44] hover:text-[#2FAC0C] transition-colors",
													children: "grainhero@gmail.com"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-sm text-[#404F44]/60 mt-1",
													children: "We'll respond within 24 hours"
												})
											] })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start gap-4 bg-white p-6 rounded-xl shadow-sm border border-[#2FAC0C]/10",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "bg-[#2FAC0C]/10 p-3 rounded-lg",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "w-6 h-6 text-[#2FAC0C]" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
													className: "font-bold text-[#252d26] mb-1",
													children: "Call Us"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
													href: "tel:+923455904427",
													className: "text-[#404F44] hover:text-[#2FAC0C] transition-colors",
													children: "+92 345 5904427"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-sm text-[#404F44]/60 mt-1",
													children: "Mon-Fri, 9am-6pm PKT"
												})
											] })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start gap-4 bg-white p-6 rounded-xl shadow-sm border border-[#2FAC0C]/10",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "bg-[#2FAC0C]/10 p-3 rounded-lg",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquare, { className: "w-6 h-6 text-[#2FAC0C]" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
												className: "font-bold text-[#252d26] mb-1",
												children: "Live Chat"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[#404F44]",
												children: "Available 24/7"
											})] })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start gap-4 bg-white p-6 rounded-xl shadow-sm border border-[#2FAC0C]/10",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "bg-[#2FAC0C]/10 p-3 rounded-lg",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "w-6 h-6 text-[#2FAC0C]" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
												className: "font-bold text-[#252d26] mb-1",
												children: "Office"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-[#404F44]",
												children: [
													"NASTP Alpha Techno Square",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
													"Old Airport Rawalpindi",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
													"Pakistan"
												]
											})] })]
										})
									]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
							initial: {
								opacity: 0,
								x: 30
							},
							animate: {
								opacity: 1,
								x: 0
							},
							transition: { duration: .6 },
							className: "bg-white rounded-2xl p-8 shadow-lg border border-[#2FAC0C]/20",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-2xl font-black text-[#252d26] mb-6",
								children: "Send us a Message"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								onSubmit: handleSubmit,
								className: "space-y-6",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										htmlFor: "name",
										className: "block text-sm font-semibold text-[#252d26] mb-2",
										children: "Full Name *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										id: "name",
										name: "name",
										required: true,
										value: formData.name,
										onChange: handleChange,
										className: "w-full px-4 py-3 border-2 border-[#2FAC0C]/20 rounded-lg focus:border-[#2FAC0C] focus:outline-none transition-colors",
										placeholder: "Your name"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										htmlFor: "email",
										className: "block text-sm font-semibold text-[#252d26] mb-2",
										children: "Email Address *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "email",
										id: "email",
										name: "email",
										required: true,
										value: formData.email,
										onChange: handleChange,
										className: "w-full px-4 py-3 border-2 border-[#2FAC0C]/20 rounded-lg focus:border-[#2FAC0C] focus:outline-none transition-colors",
										placeholder: "your@example.com"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										htmlFor: "phone",
										className: "block text-sm font-semibold text-[#252d26] mb-2",
										children: "Phone Number"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "tel",
										id: "phone",
										name: "phone",
										value: formData.phone,
										onChange: handleChange,
										className: "w-full px-4 py-3 border-2 border-[#2FAC0C]/20 rounded-lg focus:border-[#2FAC0C] focus:outline-none transition-colors",
										placeholder: "your phone number"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										htmlFor: "subject",
										className: "block text-sm font-semibold text-[#252d26] mb-2",
										children: "Subject *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										id: "subject",
										name: "subject",
										required: true,
										value: formData.subject,
										onChange: handleChange,
										className: "w-full px-4 py-3 border-2 border-[#2FAC0C]/20 rounded-lg focus:border-[#2FAC0C] focus:outline-none transition-colors",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "",
												children: "Select a subject"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "general",
												children: "General Inquiry"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "sales",
												children: "Sales & Pricing"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "support",
												children: "Technical Support"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "partnership",
												children: "Partnership Opportunities"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "other",
												children: "Other"
											})
										]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										htmlFor: "message",
										className: "block text-sm font-semibold text-[#252d26] mb-2",
										children: "Message *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										id: "message",
										name: "message",
										required: true,
										rows: 5,
										value: formData.message,
										onChange: handleChange,
										className: "w-full px-4 py-3 border-2 border-[#2FAC0C]/20 rounded-lg focus:border-[#2FAC0C] focus:outline-none transition-colors resize-none",
										placeholder: "Tell us how we can help..."
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "submit",
										disabled: isSubmitting,
										className: "w-full bg-[#2FAC0C] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
										children: isSubmitting ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }), "Sending..."] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "w-5 h-5" }), "Send Message"] })
									}),
									submitStatus === "success" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
										initial: {
											opacity: 0,
											y: -10
										},
										animate: {
											opacity: 1,
											y: 0
										},
										className: "flex items-center gap-2 p-4 bg-green-50 border-2 border-green-200 rounded-lg",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "w-5 h-5 text-green-600 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-green-800 font-semibold text-sm",
											children: "✓ Message sent successfully! We'll get back to you within 24 hours."
										})]
									}),
									submitStatus === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
										initial: {
											opacity: 0,
											y: -10
										},
										animate: {
											opacity: 1,
											y: 0
										},
										className: "flex items-start gap-2 p-4 bg-red-50 border-2 border-red-200 rounded-lg",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-5 h-5 text-red-600 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-red-800 text-sm",
											children: errorMessage
										})]
									})
								]
							})]
						})]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewFooter, {})
		]
	});
}
//#endregion
export { ContactPage as component };
