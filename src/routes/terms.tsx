import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Scale, FileText, AlertCircle, CheckCircle, XCircle, Users } from "lucide-react";
import { NewGlassNav } from "@/components/landing/NewGlassNav";
import { NewFooter } from "@/components/landing/NewFooter";
import { LocalizedContent } from "@/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — GrainHero" },
      {
        name: "description",
        content:
          "GrainHero Terms of Service. Read our terms and conditions for using the platform.",
      },
      { property: "og:title", content: "Terms of Service — GrainHero" },
      {
        property: "og:description",
        content:
          "GrainHero Terms of Service. Read our terms and conditions for using the platform.",
      },
      { property: "og:url", content: "https://grainhero.app/terms" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://grainhero.app/terms" }],
  }),
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  const sections = [
    {
      icon: FileText,
      title: "Acceptance of Terms",
      description:
        "By accessing and using GrainHero, you enter into a binding agreement with us. These terms govern your use of our grain storage monitoring platform and all related services.",
      points: [
        "These terms apply to all users, customers, and service providers",
        "By creating an account, you accept these Terms of Service",
        "If you disagree with any part of these terms, you may not use our platform",
        "Continued use of the service constitutes acceptance of updated terms",
        "You must be 18 years or older to use this service",
        "Corporate accounts must be created by authorized representatives",
      ],
    },
    {
      icon: Users,
      title: "User Accounts and Responsibilities",
      description:
        "Account security and proper use are your responsibility. We provide the tools, but you must maintain the security and accuracy of your account information.",
      points: [
        "Provide accurate, current, and complete registration information",
        "Maintain and promptly update your account information",
        "Keep your account credentials secure and confidential",
        "Notify us immediately of any unauthorized account access",
        "You are responsible for all activities under your account",
        "Do not share your account with others or create multiple accounts",
      ],
    },
    {
      icon: CheckCircle,
      title: "Acceptable Use Policy",
      description:
        "Our platform is designed for legitimate grain storage monitoring. We expect all users to use our services responsibly and in accordance with applicable laws.",
      points: [
        "Use the service only for lawful purposes and legitimate business activities",
        "Do not transmit malicious code, viruses, or harmful software",
        "Do not interfere with or disrupt our services or servers",
        "Do not attempt unauthorized access to any part of our system",
        "Respect the intellectual property rights of others",
        "Comply with all applicable local, state, national, and international laws",
      ],
    },
    {
      icon: Scale,
      title: "Intellectual Property Rights",
      description:
        "GrainHero and its content are protected by intellectual property laws. We grant you limited rights to use our platform, but ownership remains with us.",
      points: [
        "All platform content, features, and functionality are our exclusive property",
        "Protected by copyright, trademark, patent, and trade secret laws",
        "You may not reproduce, distribute, or modify our platform without permission",
        "Your sensor data and analytics remain your property",
        "We retain rights to aggregated, anonymized data for service improvement",
        "License to use our platform is non-exclusive and revocable",
      ],
    },
    {
      icon: AlertCircle,
      title: "Disclaimers and Limitation of Liability",
      description:
        "While we strive for excellence, our service is provided as-is. Understanding these limitations is important for all users.",
      points: [
        'Service provided "as is" without warranties of any kind',
        "We do not guarantee uninterrupted or error-free service",
        "Not liable for indirect, incidental, or consequential damages",
        "Total liability limited to amounts paid in the past 12 months",
        "You are responsible for backup and security of your data",
        "We are not liable for third-party integrations or services",
      ],
    },
    {
      icon: XCircle,
      title: "Termination and Suspension",
      description:
        "Either party may terminate this agreement under certain conditions. We reserve the right to suspend accounts that violate our terms.",
      points: [
        "You may cancel your subscription at any time through account settings",
        "We may suspend or terminate accounts for Terms violations",
        "Termination may be immediate for serious breaches",
        "Upon termination, your right to use the service ceases immediately",
        "We may retain certain data as required by law or legitimate business needs",
        "Fees paid are non-refundable except as required by law",
      ],
    },
  ];

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
                Terms of Service
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDE9D4] mb-6">
              Terms & <span className="text-[#2FAC0C]">Conditions</span>
            </h1>
            <p className="text-xl text-[#EDE9D4]/80 leading-relaxed">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-lg text-[#404F44] leading-relaxed">
              These Terms of Service ("Terms") govern your access to and use of the GrainHero
              platform, including our website, mobile applications, and related services
              (collectively, the "Service"). By using GrainHero, you agree to these Terms. Please
              read them carefully.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Terms Sections */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border-2 border-[#252d26]/10 hover:scale-105 transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className="bg-[#2FAC0C]/10 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                    <section.icon className="w-6 h-6 text-[#2FAC0C]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#252d26] mb-2">{section.title}</h3>
                    <p className="text-sm text-[#404F44]/70 leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {section.points.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#2FAC0C] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm text-[#404F44] leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Sections */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl font-bold text-[#252d26] mb-3">Payment Terms</h3>
            <p className="text-[#404F44] leading-relaxed">
              Subscription fees are billed in advance on a monthly or annual basis. All fees are
              non-refundable except as required by law. We reserve the right to change our fees with
              30 days' notice.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h3 className="text-2xl font-bold text-[#252d26] mb-3">Changes to Terms</h3>
            <p className="text-[#404F44] leading-relaxed">
              We may modify these Terms at any time. We will notify you of material changes via
              email or through the Service. Your continued use of GrainHero after such notification
              constitutes acceptance of the updated Terms.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-2xl font-bold text-[#252d26] mb-3">Governing Law</h3>
            <p className="text-[#404F44] leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the
              jurisdiction in which GrainHero operates, without regard to its conflict of law
              provisions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#EDE9D4]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-black text-[#252d26] mb-4">
              Questions About These Terms?
            </h2>
            <p className="text-lg text-[#404F44] mb-6">
              If you have any questions about these Terms of Service, please contact our legal team.
            </p>
            <a
              href="mailto:grainhero@gmail.com"
              className="inline-block bg-[#2FAC0C] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#2FAC0C]/90 hover:scale-105 transition-all"
            >
              Contact Legal Team
            </a>
          </motion.div>
        </div>
      </section>

      <NewFooter />
    </main></LocalizedContent>
  );
}
