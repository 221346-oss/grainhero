import { Wheat, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/i18n";

export function NewFooter() {
  const { t } = useTranslation();
  return (
    <footer className="bg-[#111512] text-[#FAFAF7] pt-16 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-12 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2">
              <Wheat className="w-8 h-8 text-[#2FA84F]" />
              <span className="text-xl font-bold text-[#FAFAF7]">GrainHero</span>
            </div>
            <p className="text-[#FAFAF7]/70 text-sm leading-relaxed">
              {t("footer.tagline")}
            </p>
            {/* Social Media */}
            <div className="flex gap-3 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#FAFAF7]/10 hover:bg-[#2FA84F] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#FAFAF7]/10 hover:bg-[#2FA84F] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/grain-hero-841723419/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#FAFAF7]/10 hover:bg-[#2FA84F] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#FAFAF7]/10 hover:bg-[#2FA84F] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="text-[#FAFAF7] font-bold text-lg mb-4">{t("footer.solutions")}</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/solutions/grain-storage-monitoring"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.grainStorageMonitoring")}
                </Link>
              </li>
              <li>
                <Link
                  to="/solutions/silo-monitoring-system"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.siloMonitoringSystem")}
                </Link>
              </li>
              <li>
                <Link
                  to="/solutions/grain-management-software"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.grainManagementSoftware")}
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  hash="features"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.features")}
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  hash="how-it-works"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.howItWorks")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-[#FAFAF7] font-bold text-lg mb-4">{t("footer.company")}</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/about"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.aboutUs")}
                </Link>
              </li>
              <li>
                <Link
                  to="/team"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.team")}
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.resources")}
                </Link>
              </li>
              <li>
                <Link
                  to="/guides/grain-storage"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.grainStorageGuide")}
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Contact Column */}
          <div>
            <h3 className="text-[#FAFAF7] font-bold text-lg mb-4">{t("footer.support")}</h3>
            <ul className="space-y-3 mb-6">
              <li>
                <Link
                  to="/help"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.helpCenter")}
                </Link>
              </li>
              <li>
                <Link
                  to="/docs"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.documentation")}
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-[#FAFAF7]/70 hover:text-[#2FA84F] transition-colors text-sm"
                >
                  {t("footer.termsOfService")}
                </Link>
              </li>
            </ul>

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[#FAFAF7]/70">
                <Mail className="w-4 h-4 text-[#2FA84F]" />
                <a
                  href="mailto:grainhero@gmail.com"
                  className="hover:text-[#2FA84F] transition-colors"
                >
                  grainhero@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2 text-[#FAFAF7]/70">
                <Phone className="w-4 h-4 text-[#2FA84F]" />
                <a href="tel:+923455904427" className="hover:text-[#2FA84F] transition-colors">
                  +92 345 5904427
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#FAFAF7]/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[#FAFAF7]/50 text-sm text-center md:text-left">
              © {new Date().getFullYear()} GrainHero. {t("common.copyRight")}
            </p>
            <div className="flex gap-6 text-sm">
              <Link
                to="/privacy"
                className="text-[#FAFAF7]/50 hover:text-[#2FA84F] transition-colors"
              >
                {t("footer.privacy")}
              </Link>
              <Link
                to="/terms"
                className="text-[#FAFAF7]/50 hover:text-[#2FA84F] transition-colors"
              >
                {t("footer.terms")}
              </Link>
              <Link
                to="/cookies"
                className="text-[#FAFAF7]/50 hover:text-[#2FA84F] transition-colors"
              >
                {t("footer.cookies")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
