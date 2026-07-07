'use client'

import { Wheat } from 'lucide-react'
import { Link } from '@/i18n/navigation'

export function PremiumFooter() {
  const currentYear = new Date().getFullYear()


  const productLinks = [
    { href: '/pricing', label: 'Pricing' },
    { href: '/checkout', label: 'Get Started' },
    { href: '/auth/login', label: 'Login' }
  ]

  const companyLinks = [
    { href: '/about', label: 'About Us' },
    { href: '/faq', label: 'FAQs' },
    { href: '/contact', label: 'Contact' },
    { href: '/privacy-policy', label: 'Privacy Policy' }
  ]

  return (
    <footer className="relative py-20 bg-black text-white">
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 max-w-7xl">
        <div className="grid grid-cols-12 gap-8 lg:gap-12">
          {/* Logo and Description */}
          <div className="col-span-12 md:col-span-6">
            <div className="flex items-center gap-2 mb-4">
              <Wheat className="w-8 h-8 text-[#00a63e]" />
              <span className="text-2xl font-bold tracking-wide">GrainHero</span>
            </div>
            <p className="text-gray-400 leading-relaxed mb-6 max-w-sm">
              AI-powered grain storage management for the modern age. Monitor, predict, and optimize
              your harvest with intelligent IoT sensors and machine learning.
            </p>

            {/* Social icons */}
            <div className="flex items-center space-x-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#00a63e]/20 transition-all hover:scale-110"
                aria-label="Twitter"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#00a63e]/20 transition-all hover:scale-110"
                aria-label="LinkedIn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#00a63e]/20 transition-all hover:scale-110"
                aria-label="Facebook"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12a10 10 0 1 0-11.5 9.9v-7h-2v-3h2v-2.3c0-2 1.2-3.1 3-3.1.9 0 1.8.1 1.8.1v2h-1c-1 0-1.3.6-1.3 1.2V12h2.2l-.3 3h-1.9v7A10 10 0 0 0 22 12" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product links */}
          <div className="col-span-6 md:col-span-3">
            <h4 className="font-bold text-lg mb-4 text-white">Product</h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-[#00a63e] transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div className="col-span-6 md:col-span-3">
            <h4 className="font-bold text-lg mb-4 text-white">Company</h4>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-[#00a63e] transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>


        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 mt-16">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500 mb-4 md:mb-0">
              © {currentYear} GrainHero. All rights reserved.
            </div>

          </div>
        </div>
      </div>
    </footer>
  )
}
