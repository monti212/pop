import React from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Heart, Linkedin } from 'lucide-react';

interface NewFooterProps {
}

const NewFooter: React.FC<NewFooterProps> = () => {
  return (
    <footer className="py-8 sm:py-12 lg:py-16 bg-sand-200 border-t border-borders">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* Column 1: Logo and Description */}
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 text-navy/80 max-w-md text-sm">
              Pencils of Promise creates a better world through education, building schools, and empowering communities with AI-powered learning tools.
            </p>
            
            <div className="flex gap-3 mt-5">
              <motion.a
                href="https://www.linkedin.com/company/pencils-of-promise"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center text-navy hover:bg-teal/30 transition-colors duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </motion.a>
            </div>
          </div>
          
          {/* Column 2: Quick Links */}
          <div>
            <h3 className="font-semibold text-navy text-lg mb-4">Quick Links</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/terms" className="text-navy/80 hover:text-teal transition-colors duration-200">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-navy/80 hover:text-teal transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/api-docs" className="text-navy/80 hover:text-teal transition-colors duration-200">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="text-navy/80 hover:text-teal transition-colors duration-200">
                  Admin Panel
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Column 3: Contact */}
          <div>
            <h3 className="font-semibold text-navy text-lg mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="mailto:info@pencilsofpromise.org"
                  className="flex items-center gap-2 text-navy/80 hover:text-teal transition-colors duration-200"
                >
                  <Mail className="w-4 h-4" />
                  <span>info@pencilsofpromise.org</span>
                </a>
              </li>
              <li>
                <div className="flex items-center gap-2 text-navy/80">
                  <MapPin className="w-4 h-4" />
                  <span>New York, USA</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 sm:mt-10 lg:mt-12 pt-6 sm:pt-8 border-t border-borders flex flex-col md:flex-row justify-between items-center text-navy/60 text-xs sm:text-sm">
          <p className="mb-3 md:mb-0">© 2025 Pencils of Promise. All rights reserved.</p>
          <div className="flex items-center">
            <p className="flex items-center">
              Made with <Heart className="w-3 h-3 mx-1 text-orange" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default NewFooter;