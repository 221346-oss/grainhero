import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wheat, Menu, X } from 'lucide-react'
import { Link } from '@tanstack/react-router'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/team', label: 'Team' },
  { href: '/contact', label: 'Contact' },
  { href: '/blog', label: 'Blog' },
]

export function NewGlassNav() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setIsScrolled(currentScrollY > 50)

      // Hide header when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 150) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }

      lastScrollY = currentScrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      setIsMobileMenuOpen(false)
      setTimeout(() => {
        const el = document.querySelector(href)
        el?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else {
      // Regular link, let it navigate normally
      setIsMobileMenuOpen(false)
    }
  }

  return (
    <>
      {/* Fixed Top Navbar */}
      <motion.nav
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
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
            isScrolled
              ? 'bg-[#252d26]/95 backdrop-blur-md shadow-lg'
              : 'bg-transparent'
          }`}
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Wheat className="w-6 h-6 sm:w-8 sm:h-8 text-[#2FAC0C]" />
              <span className="text-[#EDE9D4] text-lg sm:text-xl font-bold tracking-wide">
                GrainHero
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleAnchorClick(e, link.href)}
                  className="text-[#EDE9D4]/90 hover:text-[#EDE9D4] font-medium transition-all duration-300 hover:scale-105 text-sm tracking-wide relative group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#2FAC0C] group-hover:w-full transition-all duration-300" />
                </a>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-3">
              <Link
                to="/auth/login"
                className="hidden sm:inline-block text-[#EDE9D4]/90 hover:text-[#EDE9D4] font-medium transition-colors text-sm"
              >
                Login
              </Link>
              <Link
                to="/checkout"
                className="hidden sm:inline-block bg-[#2FAC0C] text-white font-semibold px-5 py-2.5 rounded-full hover:bg-[#2FAC0C]/90 transition-all duration-300 text-sm shadow-lg hover:shadow-xl hover:scale-105"
              >
                Get Started
              </Link>

              {/* Mobile: MENU Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden text-[#EDE9D4] p-2 cursor-pointer hover:text-[#2FAC0C] transition-colors"
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
            className="md:hidden fixed inset-0 z-[3000] bg-[#252d26]"
          >
            {/* Close Button */}
            <div className="absolute top-6 right-6">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[#EDE9D4] p-2 hover:text-[#2FAC0C] transition-colors"
                aria-label="Close menu"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* Logo */}
            <Link to="/" className="absolute top-6 left-6 flex items-center gap-2">
              <Wheat className="w-7 h-7 text-[#2FAC0C]" />
              <span className="text-[#EDE9D4] text-xl font-bold">GrainHero</span>
            </Link>

            {/* Nav Links */}
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  onClick={(e) => {
                    handleAnchorClick(e, link.href)
                    setIsMobileMenuOpen(false)
                  }}
                  className="text-[#EDE9D4] text-2xl font-medium hover:text-[#2FAC0C] transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-6 flex flex-col space-y-4"
              >
                <Link
                  to="/auth/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-[#EDE9D4] text-xl font-medium hover:text-[#2FAC0C] transition-colors text-center"
                >
                  Login
                </Link>
                <Link
                  to="/checkout"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="bg-[#2FAC0C] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#2FAC0C]/90 transition-all text-center"
                >
                  Get Started
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
