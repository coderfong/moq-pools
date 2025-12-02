export default function Benefits() {
  return (
    <section id="benefits" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-12 md:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-6 md:mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            Benefits
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight">
            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Why Choose Order Pooling?
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 font-medium">The smartest way to shop for quality products at unbeatable prices</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
          {/* Save Up to 60% */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"></div>
            <div className="relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform mb-3 sm:mb-4 md:mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
                  <polyline points="16 17 22 17 22 11"></polyline>
                </svg>
              </div>
              <h3 className="text-sm sm:text-base md:text-xl font-bold !text-gray-900 mb-2 sm:mb-3 md:mb-4">Save Up to 60%</h3>
              <p className="!text-gray-600 leading-relaxed text-[10px] sm:text-xs md:text-base">Access wholesale prices without buying in bulk. Pool with others to unlock massive savings.</p>
            </div>
          </div>

          {/* Buyer Protection */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"></div>
            <div className="relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 group-hover:scale-110 transition-transform mb-3 sm:mb-4 md:mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                </svg>
              </div>
              <h3 className="text-sm sm:text-base md:text-xl font-bold !text-gray-900 mb-2 sm:mb-3 md:mb-4">Buyer Protection</h3>
              <p className="!text-gray-600 leading-relaxed text-[10px] sm:text-xs md:text-base">Every order is backed by our guarantee. If the pool doesn't meet MOQ, get a full refund.</p>
            </div>
          </div>

          {/* Fast & Simple */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"></div>
            <div className="relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 group-hover:scale-110 transition-transform mb-3 sm:mb-4 md:mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                </svg>
              </div>
              <h3 className="text-sm sm:text-base md:text-xl font-bold !text-gray-900 mb-2 sm:mb-3 md:mb-4">Fast &amp; Simple</h3>
              <p className="!text-gray-600 leading-relaxed text-[10px] sm:text-xs md:text-base">Join a pool in seconds. We handle all logistics, quality checks, and shipping coordination.</p>
            </div>
          </div>

          {/* Community Driven */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"></div>
            <div className="relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 text-pink-600 group-hover:scale-110 transition-transform mb-3 sm:mb-4 md:mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3 className="text-sm sm:text-base md:text-xl font-bold !text-gray-900 mb-2 sm:mb-3 md:mb-4">Community Driven</h3>
              <p className="!text-gray-600 leading-relaxed text-[10px] sm:text-xs md:text-base">Connect with like-minded buyers. Share reviews, tips, and discover great products together.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
