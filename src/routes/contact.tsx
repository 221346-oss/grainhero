import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { NewGlassNav } from "@/components/landing/NewGlassNav";
import { NewFooter } from "@/components/landing/NewFooter";
import { sendContactEmail } from "@/lib/contact-email.functions";
import { LocalizedContent } from "@/i18n";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — GrainHero" },
      {
        name: "description",
        content:
          "Get in touch with GrainHero. We're here to help with any questions about our grain storage monitoring platform.",
      },
      { property: "og:title", content: "Contact Us — GrainHero" },
      {
        property: "og:description",
        content:
          "Get in touch with GrainHero. We're here to help with questions about grain storage monitoring.",
      },
      { property: "og:url", content: "https://grainhero.app/contact" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://grainhero.app/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const result = await sendContactEmail({
        data: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message,
        },
      });

      if (result.success) {
        setSubmitStatus("success");
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: "",
        });

        setTimeout(() => {
          setSubmitStatus("idle");
        }, 5000);
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <LocalizedContent><main className="min-h-screen bg-[#EDE9D4]">
      <NewGlassNav />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-[#252d26] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, rgba(47,172,12,0.4) 1px, transparent 0)",
              backgroundSize: "40px 40px",
              width: "100%",
              height: "100%",
            }}
          />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block bg-[#2FAC0C]/10 px-4 py-2 rounded-full mb-6">
              <span className="text-[#2FAC0C] text-sm font-semibold uppercase tracking-wider">
                Get In Touch
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6">
              Contact <span className="text-[#2FAC0C]">GrainHero</span>
            </h1>
            <p className="text-xl text-[#EDE9D4]/80 leading-relaxed">
              Have questions? We're here to help you protect your grain with smart technology.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-black text-[#252d26] mb-6">
                Let's <span className="text-[#2FAC0C]">Connect</span>
              </h2>
              <p className="text-[#404F44] text-lg mb-8 leading-relaxed">
                Whether you're interested in our platform, need technical support, or want to
                explore partnership opportunities, our team is ready to assist you.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-sm border border-[#2FAC0C]/10">
                  <div className="bg-[#2FAC0C]/10 p-3 rounded-lg">
                    <Mail className="w-6 h-6 text-[#2FAC0C]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#252d26] mb-1">Email Us</h3>
                    <a
                      href="mailto:grainhero@gmail.com"
                      className="text-[#404F44] hover:text-[#2FAC0C] transition-colors"
                    >
                      grainhero@gmail.com
                    </a>
                    <p className="text-sm text-[#404F44]/60 mt-1">We'll respond within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-sm border border-[#2FAC0C]/10">
                  <div className="bg-[#2FAC0C]/10 p-3 rounded-lg">
                    <Phone className="w-6 h-6 text-[#2FAC0C]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#252d26] mb-1">Call Us</h3>
                    <a
                      href="tel:+923455904427"
                      className="text-[#404F44] hover:text-[#2FAC0C] transition-colors"
                    >
                      +92 345 5904427
                    </a>
                    <p className="text-sm text-[#404F44]/60 mt-1">Mon-Fri, 9am-6pm PKT</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-sm border border-[#2FAC0C]/10">
                  <div className="bg-[#2FAC0C]/10 p-3 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-[#2FAC0C]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#252d26] mb-1">Live Chat</h3>
                    <p className="text-[#404F44]">Available 24/7</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-sm border border-[#2FAC0C]/10">
                  <div className="bg-[#2FAC0C]/10 p-3 rounded-lg">
                    <MapPin className="w-6 h-6 text-[#2FAC0C]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#252d26] mb-1">Office</h3>
                    <p className="text-[#404F44]">
                      NASTP Alpha Techno Square
                      <br />
                      Old Airport Rawalpindi
                      <br />
                      Pakistan
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-[#2FAC0C]/20"
            >
              <h2 className="text-2xl font-black text-[#252d26] mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-[#252d26] mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-[#2FAC0C]/20 rounded-lg focus:border-[#2FAC0C] focus:outline-none transition-colors"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-[#252d26] mb-2"
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-[#2FAC0C]/20 rounded-lg focus:border-[#2FAC0C] focus:outline-none transition-colors"
                    placeholder="your@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-semibold text-[#252d26] mb-2"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-[#2FAC0C]/20 rounded-lg focus:border-[#2FAC0C] focus:outline-none transition-colors"
                    placeholder="your phone number"
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-semibold text-[#252d26] mb-2"
                  >
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-[#2FAC0C]/20 rounded-lg focus:border-[#2FAC0C] focus:outline-none transition-colors"
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="sales">Sales & Pricing</option>
                    <option value="support">Technical Support</option>
                    <option value="partnership">Partnership Opportunities</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-semibold text-[#252d26] mb-2"
                  >
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-[#2FAC0C]/20 rounded-lg focus:border-[#2FAC0C] focus:outline-none transition-colors resize-none"
                    placeholder="Tell us how we can help..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#2FAC0C] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>

                {/* Success Message */}
                {submitStatus === "success" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-green-50 border-2 border-green-200 rounded-lg"
                  >
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <p className="text-green-800 font-semibold text-sm">
                      ✓ Message sent successfully! We'll get back to you within 24 hours.
                    </p>
                  </motion.div>
                )}

                {/* Error Message */}
                {submitStatus === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 p-4 bg-red-50 border-2 border-red-200 rounded-lg"
                  >
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-800 text-sm">{errorMessage}</p>
                  </motion.div>
                )}
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      <NewFooter />
    </main></LocalizedContent>
  );
}
