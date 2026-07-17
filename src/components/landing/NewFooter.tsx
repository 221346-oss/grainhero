import { Wheat, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export function NewFooter() {
  return (
    <footer className="bg-[#252d26] text-[#EDE9D4] pt-16 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wheat className="w-8 h-8 text-[#2FAC0C]" />
              <span className="text-xl font-bold text-[#EDE9D4]">GrainHero</span>
            </div>
            <p className="text-[#EDE9D4]/70 text-sm leading-relaxed">
              AI-powered grain storage management platform helping farmers protect their harvest
              and maximize profits with intelligent monitoring and predictive analytics.
            </p>
            {/* Social Media */}
            <div className="flex gap-3 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#EDE9D4]/10 hover:bg-[#2FAC0C] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#EDE9D4]/10 hover:bg-[#2FAC0C] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/grain-hero-841723419/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#EDE9D4]/10 hover:bg-[#2FAC0C] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#EDE9D4]/10 hover:bg-[#2FAC0C] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="text-[#EDE9D4] font-bold text-lg mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" hash="features" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/" hash="pricing" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/" hash="how-it-works" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/" hash="technology" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  Technology
                </Link>
              </li>
              <li>
                <Link to="/" hash="faq" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-[#EDE9D4] font-bold text-lg mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/team" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  Team
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  Blog
                </Link>
              </li>
               <li>
                <Link to="/contact" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Contact Column */}
          <div>
            <h3 className="text-[#EDE9D4] font-bold text-lg mb-4">Support</h3>
            <ul className="space-y-3 mb-6">
              <li>
                <Link to="/help" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/docs" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-[#EDE9D4]/70 hover:text-[#2FAC0C] transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
            </ul>

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[#EDE9D4]/70">
                <Mail className="w-4 h-4 text-[#2FAC0C]" />
                <a href="mailto:grainhero@gmail.com" className="hover:text-[#2FAC0C] transition-colors">
                  grainhero@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2 text-[#EDE9D4]/70">
                <Phone className="w-4 h-4 text-[#2FAC0C]" />
                <a href="tel:+923455904427" className="hover:text-[#2FAC0C] transition-colors">
                  +92 345 5904427
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#EDE9D4]/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[#EDE9D4]/50 text-sm text-center md:text-left">
              © {new Date().getFullYear()} GrainHero. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/privacy" className="text-[#EDE9D4]/50 hover:text-[#2FAC0C] transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="text-[#EDE9D4]/50 hover:text-[#2FAC0C] transition-colors">
                Terms
              </Link>
              <Link to="/cookies" className="text-[#EDE9D4]/50 hover:text-[#2FAC0C] transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
