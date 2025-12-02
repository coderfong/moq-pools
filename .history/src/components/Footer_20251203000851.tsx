import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();
  
  return (
    <footer className="bg-gradient-to-b from-white to-gray-50 border-t border-gray-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-8 lg:gap-12 mb-12">
          {/* Brand & intro */}
          <div className="col-span-2 lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                  <path d="M3 6h18"></path>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                MOQ Pools
              </span>
            </div>
            <p className="text-gray-600 max-w-sm leading-relaxed">
              Join buyers pooling orders to meet MOQ and unlock wholesale pricing together. 
              Smart shopping, better prices.
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="https://instagram.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-white hover:shadow-lg hover:shadow-orange-500/50 flex items-center justify-center transition-all duration-200 hover:scale-110" 
                aria-label="Instagram"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                </svg>
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/50 flex items-center justify-center transition-all duration-200 hover:scale-110" 
                aria-label="Twitter"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:shadow-lg hover:shadow-blue-600/50 flex items-center justify-center transition-all duration-200 hover:scale-110" 
                aria-label="Facebook"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-[10px] sm:text-sm uppercase tracking-wider">Product</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/pools" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Active Pools
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Products
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/information/payment-protection" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Payment Protection
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-[10px] sm:text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/about" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/join" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Join as Supplier
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-[10px] sm:text-sm uppercase tracking-wider col-span-2 sm:col-span-1">Support</h3>
            <ul className="space-y-2 sm:space-y-3 col-span-2 sm:col-span-1">
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-gray-600 hover:text-orange-600 transition-colors text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Shipping Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {year} MOQ Pools. All rights reserved.
            </p>
            
            <div className="flex items-center gap-6">
              <a 
                href="mailto:support@moqmarket.com" 
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 transition-colors group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 group-hover:scale-110 transition-transform">
                  <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
                support@moqmarket.com
              </a>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-500">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                  <path d="m9 12 2 2 4-4"></path>
                </svg>
                <span>Secure payments by Stripe</span>
              </div>
            </div>
          </div>
          
          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-blue-500">
                <rect width="20" height="14" x="2" y="5" rx="2"></rect>
                <line x1="2" x2="22" y1="10" y2="10"></line>
              </svg>
              <span>All major cards accepted</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-orange-500">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.29 7 12 12 20.71 7"></polyline>
                <line x1="12" x2="12" y1="22" y2="12"></line>
              </svg>
              <span>Fast worldwide shipping</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-purple-500">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>24/7 customer support</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
