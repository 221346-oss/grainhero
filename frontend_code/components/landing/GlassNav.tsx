'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wheat, Menu } from 'lucide-react'
import { Link } from '@/i18n/navigation'
const navLinks = [
  { href: '#features', label: 'FEATURES' },
  { href: '#how-it-works', label: 'HOW IT WORKS' },
  { href: '#pricing', label: 'PRICING' },
  { href: '/about', label: 'ABOUT', isRoute: true },
  { href: '/contact', label: 'CONTACT', isRoute: true },
]

export function GlassNav() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      setIsMobileMenuOpen(false)
      setTimeout(() => {
        const el = document.querySelector(href)
        el?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }

  return (
    <>
      {/* ─── Fixed Top Navbar ─── */}
      <motion.nav
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        variants={{
          visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            rotateZ: 0,
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
          },
          hidden: {
            opacity: 0,
            y: 20,
            scale: 1.15,
            rotateX: -25,
            rotateZ: -2,
            transition: { duration: 0.4, ease: [0.55, 0.085, 0.68, 0.53] }
          }
        }}
        style={{ perspective: "1000px", transformOrigin: "top center" }}
        className="fixed top-0 left-0 right-0 w-full z-[110]"
      >
        <div
          className={`w-full px-4 sm:px-8 lg:px-12 py-3 sm:py-4 transition-all duration-300 ease-out ${isScrolled ? 'glass-navbar-green' : 'bg-transparent'
            }`}
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer gap-2"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <Wheat className="w-6 h-6 sm:w-8 sm:h-8 text-[#00a63e]" />
              <span className="text-white text-lg sm:text-xl font-bold tracking-wide">GrainHero</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              {navLinks.map((link) =>
                link.isRoute ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-white/90 hover:text-white font-medium transition-all duration-300 hover:scale-105 text-sm uppercase tracking-wide"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleAnchorClick(e, link.href)}
                    className="text-white/90 hover:text-white font-medium transition-all duration-300 hover:scale-105 text-sm uppercase tracking-wide"
                  >
                    {link.label}
                  </a>
                )
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-3">
              <Link
                href="/auth/login"
                className="hidden sm:inline-block text-white/90 hover:text-white font-medium transition-colors text-sm"
              >
                Login
              </Link>
              <Link
                href="/checkout"
                className="hidden sm:inline-block bg-[#00a63e] text-white font-semibold px-5 py-2 rounded-full hover:bg-[#029238] transition-all duration-300 text-sm"
              >
                Get Started
              </Link>

              {/* Mobile: MENU Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden text-white p-2 cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ─── Full-Screen Mobile Menu (Template Style) ─── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="md:hidden fixed inset-0 z-[3000] flex flex-col"
          >
            {/* Close bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white flex items-center justify-center py-12"
            >
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-black text-[15px] font-medium uppercase tracking-[0.2em] cursor-pointer"
              >
                CLOSE
              </button>
            </motion.div>

            {/* Nav links — stacked full-width rows */}
            <div
              className="flex-1 flex flex-col"
              style={{ background: 'linear-gradient(135deg, #0d2818 0%, #0a1f14 30%, #071208 60%, #0a1f14 100%)' }}
            >
              {navLinks.map((link, i) =>
                link.isRoute ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex-1 flex items-center justify-center text-white text-[17px] font-medium uppercase tracking-[0.15em] border-b border-white/10 transition-colors active:bg-white/10"
                    style={{
                      animationDelay: `${0.1 + i * 0.08}s`,
                    }}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => {
                      handleAnchorClick(e, link.href)
                    }}
                    className="flex-1 flex items-center justify-center text-white text-[17px] font-medium uppercase tracking-[0.15em] border-b border-white/10 transition-colors active:bg-white/10"
                    style={{
                      animationDelay: `${0.1 + i * 0.08}s`,
                    }}
                  >
                    {link.label}
                  </a>
                )
              )}

              {/* Login link */}
              <Link
                href="/auth/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 flex items-center justify-center text-white text-[17px] font-medium uppercase tracking-[0.15em] border-b border-white/10 active:bg-white/10"
              >
                LOGIN
              </Link>

              {/* Get Started CTA */}
              <div className="flex items-center justify-center py-6">
                <Link
                  href="/checkout"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="bg-[#00a63e] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#029238] transition-all text-sm uppercase tracking-wider"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
