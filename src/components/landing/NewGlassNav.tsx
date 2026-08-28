import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wheat, Menu, X, Sun, Moon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getStoredThemeMode, toggleThemeMode, type ThemeMode } from "@/lib/theme";
import { useTranslation } from "@/i18n";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";





export function NewGlassNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("light");
  const { t } = useTranslation();

  const navLinks = [
    { to: "/", label: t("nav.home") },
    { to: "/", hash: "how-it-works", label: t("nav.howItWorks") },
    { to: "/about", label: t("nav.about") },
    { to: "/blog", label: t("nav.resources") },
    { to: "/contact", label: t("nav.contact") },
  ];

  const solutionLinks = [
    { to: "/solutions/grain-storage-monitoring", label: t("solutions.grainStorageMonitoring") },
    { to: "/solutions/silo-monitoring-system", label: t("solutions.siloMonitoringSystem") },
    { to: "/solutions/grain-management-software", label: t("solutions.grainManagementSoftware") },
    { to: "/guides/grain-storage", label: t("solutions.grainStorageGuide") },
  ];

  useEffect(() => {
    setMode(getStoredThemeMode());
  }, []);

  const handleToggle = () => {
    const next = toggleThemeMode();
    setMode(next);
  };

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 50);

      // Hide header when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 150) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollY = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Fixed Top Navbar */}
      <motion.nav
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        variants={{
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
          },
          hidden: {
            opacity: 0,
            y: -20,
            transition: { duration: 0.3, ease: [0.55, 0.085, 0.68, 0.53] },
          },
        }}
        className="fixed top-0 left-0 right-0 w-full z-[110]"
      >
        <div
          className={`w-full px-4 sm:px-8 lg:px-12 py-3 sm:py-4 transition-all duration-300 ease-out ${
            isScrolled ? "bg-[#111512]/95 backdrop-blur-md shadow-lg" : "bg-transparent"
          }`}
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 cursor-pointer">
              <Wheat className="w-6 h-6 sm:w-8 sm:h-8 text-[#2FA84F]" />
              <span className="text-[#FAFAF7] text-lg sm:text-xl font-bold tracking-wide">
                GrainHero
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <div className="relative group">
                <button
                  type="button"
                  className="text-[#FAFAF7]/90 hover:text-[#FAFAF7] font-medium transition-colors text-sm tracking-wide cursor-pointer"
                >
                  {t("nav.solutions")}
                </button>
                <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="rounded-xl border border-white/10 bg-[#111512] p-2 shadow-2xl">
                    {solutionLinks.map((s) => (
                      <Link
                        key={s.to}
                        to={s.to}
                        className="block rounded-lg px-3 py-2 text-sm text-[#FAFAF7]/80 transition-colors hover:bg-[#2FA84F]/15 hover:text-[#FAFAF7]"
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              {navLinks.map((link) => (
                <Link
                  key={`${link.to}-${link.hash || ""}`}
                  to={link.to}
                  hash={link.hash}
                  className="text-[#FAFAF7]/90 hover:text-[#FAFAF7] font-medium transition-all duration-300 hover:scale-105 text-sm tracking-wide relative group cursor-pointer"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#2FA84F] group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-3">
              <Link
                to="/auth/login"
                className="hidden sm:inline-block text-[#FAFAF7]/90 hover:text-[#FAFAF7] font-medium transition-colors text-sm"
              >
                {t("nav.login")}
              </Link>
              <Link
                to="/checkout"
                className="hidden sm:inline-block bg-[#2FA84F] text-white font-semibold px-5 py-2.5 rounded-full hover:bg-[#2FA84F]/90 transition-all duration-300 text-sm shadow-lg hover:shadow-xl hover:scale-105"
              >
                {t("nav.getStarted")}
              </Link>

              {/* Language Switcher */}
              <LanguageSwitcher className="hidden sm:grid bg-white/10 text-[#FAFAF7] hover:bg-white/20" />
              {/* Theme toggle */}
              <button
                type="button"
                onClick={handleToggle}
                aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                className="hidden sm:grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[#FAFAF7] hover:bg-white/20 transition-colors"
              >
                {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Mobile: MENU Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden text-[#FAFAF7] p-2 cursor-pointer hover:text-[#2FA84F] transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Full-Screen Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 z-[3000] bg-[#111512]"
          >
            {/* Close Button */}
            <div className="absolute top-6 right-6">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[#FAFAF7] p-2 hover:text-[#2FA84F] transition-colors"
                aria-label="Close menu"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* Logo */}
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-6 left-6 flex items-center gap-2"
            >
              <Wheat className="w-7 h-7 text-[#2FA84F]" />
              <span className="text-[#FAFAF7] text-xl font-bold">GrainHero</span>
            </Link>

            {/* Nav Links */}
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              {navLinks.map((link, i) => (
                <motion.div
                  key={`${link.to}-${link.hash || ""}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                >
                  <Link
                    to={link.to}
                    hash={link.hash}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-[#FAFAF7] text-2xl font-medium hover:text-[#2FA84F] transition-colors cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="flex flex-col items-center gap-3 pt-2"
              >
                {solutionLinks.map((s) => (
                  <Link
                    key={s.to}
                    to={s.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-[#FAFAF7]/70 text-base hover:text-[#2FA84F] transition-colors"
                  >
                    {s.label}
                  </Link>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-6 flex flex-col space-y-4"
              >
                <Link
                  to="/auth/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-[#FAFAF7] text-xl font-medium hover:text-[#2FA84F] transition-colors text-center"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  to="/checkout"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="bg-[#2FA84F] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#2FA84F]/90 transition-all text-center"
                >
                  {t("nav.getStarted")}
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
