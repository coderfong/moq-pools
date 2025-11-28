import React from "react";
import Link from "next/link";
import Image from "next/image";
import stripeLogo from "../../company logos/stripe.png";

export const metadata = {
  title: "About Us | MOQ Pools",
  description:
    "We help small buyers and creators team up to reach factory MOQs and unlock wholesale pricing - fair for factories, accessible for everyone.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:py-10">
      <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-orange-600 bg-clip-text text-transparent mb-6">{title}</h2>
      <div className="mt-4 text-sm leading-6 text-gray-700">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  const siteUrl = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About PoolBuy",
    "url": `${siteUrl}/about`,
    "isPartOf": {
      "@type": "WebSite",
      "name": "PoolBuy",
      "url": siteUrl,
      "publisher": {
        "@type": "Organization",
        "name": "PoolBuy",
        "email": "chaibotsg@gmail.com"
      }
    }
  };
  return (
    <div className="pb-12 bg-gradient-to-b from-orange-50/30 via-white to-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      {/* Hero */}
      <div className="relative border-b border-orange-200/50 bg-gradient-to-br from-orange-50 via-white to-amber-50 overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        
        <div className="relative mx-auto w-full max-w-[1000px] px-4 py-12 sm:py-16">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span aria-hidden className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white text-3xl shadow-lg shadow-orange-500/30">🧠</span>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">About Us</h1>
            </div>
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                Making factory-direct access <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">easy for everyone.</span>
              </h2>
              <p className="mt-4 text-base sm:text-lg text-gray-700 leading-relaxed">
                We believe everyone - not just big brands - should be able to buy factory-direct without worrying about high
                minimum order quantities (MOQ). Our platform helps small buyers and entrepreneurs team up to unlock bulk
                discounts usually reserved for wholesalers.
              </p>
              <div className="mt-6 flex items-center gap-3 flex-wrap">
                <Link href="/products" className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300">
                  Explore group buys →
                </Link>
                <a href="/how-it-works" className="rounded-full border-2 border-orange-200 bg-white px-6 py-3 text-sm font-semibold hover:bg-orange-50 hover:border-orange-300 transition-all duration-300">
                  How it works
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Our Story */}
      <Section id="story" title="Our Story">
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-orange-200/50 bg-gradient-to-br from-orange-50/50 to-amber-50/30 p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300">
            <p className="text-base sm:text-lg leading-relaxed text-gray-800">
              It started with a frustration: factories wanted us to order 100+ units just to get a fair price - but we only needed five.
              We realized thousands of buyers around the world faced the same problem.
            </p>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-gray-800">
              So we built <span className="font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">MOQ Pools</span> - a system that lets everyday people pool demand together, meet factory MOQs, and share the savings.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 bg-white rounded-xl px-5 py-4 border-2 border-gray-200 shadow-sm">
            <span className="text-2xl">🇸🇬</span>
            <span className="font-medium">Founded in Singapore. Built for a global buyer community.</span>
          </div>
        </div>
      </Section>

      {/* Why MOQ Pooling Matters */}
      <Section id="why" title="Why MOQ Pooling Matters">
        <div className="grid gap-5 md:grid-cols-3">
          {[{
            icon: '🏭',
            title: 'Factories Deserve Fair Orders',
            desc: 'Manufacturers cannot produce one-off pieces - pooling ensures production is efficient and profitable for them.',
            gradient: 'from-blue-500/10 to-blue-600/10',
            borderColor: 'border-blue-200',
            iconBg: 'from-blue-500 to-blue-600'
          },{
            icon: '👩‍💻',
            title: 'Small Buyers Deserve Access',
            desc: 'Startups, creators, and individuals can finally buy like big companies without waste or markups.',
            gradient: 'from-orange-500/10 to-orange-600/10',
            borderColor: 'border-orange-200',
            iconBg: 'from-orange-500 to-orange-600'
          },{
            icon: '🌱',
            title: 'Sustainability by Demand',
            desc: 'Group orders reduce overproduction and excess inventory - better for everyone and the planet.',
            gradient: 'from-emerald-500/10 to-emerald-600/10',
            borderColor: 'border-emerald-200',
            iconBg: 'from-emerald-500 to-emerald-600'
          }].map((b, i) => (
            <div key={i} className={`group rounded-2xl border-2 ${b.borderColor} bg-gradient-to-br ${b.gradient} backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-2`}>
              <div className={`inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${b.iconBg} text-white text-3xl shadow-lg group-hover:scale-110 transition-transform duration-300`} aria-hidden>{b.icon}</div>
              <div className="mt-4 text-base font-bold text-gray-900">{b.title}</div>
              <div className="mt-2 text-sm text-gray-700 leading-relaxed">{b.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-6 sm:p-8 shadow-md">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-4xl">💡</div>
            <blockquote className="text-gray-800 italic text-base sm:text-lg leading-relaxed">
              <span className="font-semibold text-orange-600 text-2xl">"</span>MOQ pooling isn't just about price - it's about fair access and smarter manufacturing.<span className="font-semibold text-orange-600 text-2xl">"</span>
            </blockquote>
          </div>
        </div>
      </Section>

      {/* Founding Team */}
      <Section id="team" title="The Founding Team">
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {[{
            name: '',
            role: 'Founder',
            bio: 'Building a fair, factory-direct marketplace for small buyers and creators.',
            icon: '👨‍💼'
          },{
            name: '',
            role: 'Co-founder (Hiring)',
            bio: 'We are assembling a small, senior team across supply, product, and engineering.',
            icon: '🤝'
          },{
            name: '',
            role: 'Advisor / Partner',
            bio: 'If you are a 3PL or factory partner, reach out to collaborate.',
            icon: '🤵'
          }].map((p, i) => (
            <div key={i} className="group rounded-2xl border-2 border-gray-200 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-orange-200">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-2xl shadow-md" aria-hidden>{p.icon}</div>
                <div>
                  <div className="text-base font-bold text-gray-900">{p.name || '-'}</div>
                  <div className="text-sm text-gray-600">{p.role}</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-700 leading-relaxed">{p.bio}</div>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <a href="/register" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300">
            <span>📬</span>
            <span>We're hiring - join our mission →</span>
          </a>
        </div>
      </Section>

      {/* Vision & Future */}
      <Section id="vision" title="Our Vision & Future">
        <div className="space-y-5">
          <div className="rounded-2xl border-2 border-orange-200/50 bg-gradient-to-br from-orange-50/30 to-white p-6 sm:p-8">
            <p className="text-base sm:text-lg leading-relaxed text-gray-800 font-medium">
              We're building a world where anyone can source like a brand - safely, transparently, and affordably.
            </p>
            <ul className="mt-4 space-y-3">
              {[
                'Launch regional fulfillment hubs for faster global delivery.',
                'Expand verified factory partnerships across Asia.',
                'Introduce "instant MOQ sharing" - real-time matchmaking for buyers of the same item.'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-gray-900">
                  <span className="flex-shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold">{i + 1}</span>
                  <span className="text-gray-900">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { y: '2024', t: 'Platform launched', icon: '🚀' }, 
              { y: '2025', t: 'Reached 10,000 group buyers', icon: '🎯' }, 
              { y: '2026', t: 'Global shipping coverage (US, EU, SEA)', icon: '🌍' }
            ].map((m, i) => (
              <div key={i} className="group rounded-2xl border-2 border-gray-200 bg-white p-5 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-orange-200">
                <div className="text-3xl mb-2">{m.icon}</div>
                <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{m.y}</div>
                <div className="mt-2 text-sm text-gray-700 font-medium">{m.t}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Behind-the-Scenes / Credibility Proof */}
      <Section id="proof" title="Behind-the-Scenes / Credibility">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="text-3xl mb-3">🏭</div>
            <div className="text-base font-bold text-gray-900">Factory onboarding</div>
            <div className="mt-2 text-sm text-gray-700 leading-relaxed">We verify suppliers and share more process details as we grow.</div>
          </div>
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="text-3xl mb-3">🤝</div>
            <div className="text-base font-bold text-gray-900">Fulfillment partners</div>
            <div className="mt-3 flex items-center justify-center">
              <Image src={stripeLogo} alt="Stripe" width={80} height={30} className="h-8 w-auto" />
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">Secure payment processing partner</div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="rounded-full border-2 border-blue-200 bg-blue-50 text-blue-700 px-3 py-1 font-semibold">Verified Supplier Network</span>
              <span className="rounded-full border-2 border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-1 font-semibold">Secure Payments via Stripe</span>
              <span className="rounded-full border-2 border-orange-200 bg-orange-50 text-orange-700 px-3 py-1 font-semibold">3PL partnerships</span>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="text-3xl mb-3">⭐</div>
            <div className="text-base font-bold text-gray-900">Buyer success stories</div>
            <div className="mt-2 text-sm text-gray-700 leading-relaxed">We'll highlight real buyer stories and media mentions here.</div>
          </div>
        </div>
      </Section>

      {/* Connect With Us */}
      <Section id="connect" title="Connect With Us">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <a href="/account/messages" className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-white font-semibold hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300">
              Message us
            </a>
            <a href="mailto:chaibotsg@gmail.com" className="rounded-xl border-2 border-gray-200 bg-white px-5 py-3 font-semibold hover:bg-orange-50 hover:border-orange-300 transition-all duration-300">
              Email
            </a>
            <a href="tel:+6594799717" className="rounded-xl border-2 border-gray-200 bg-white px-5 py-3 font-semibold hover:bg-orange-50 hover:border-orange-300 transition-all duration-300">
              Call: +65 9479 9717
            </a>
            <a href="/support" className="rounded-xl border-2 border-gray-200 bg-white px-5 py-3 font-semibold hover:bg-orange-50 hover:border-orange-300 transition-all duration-300">
              Support
            </a>
          </div>
          <div className="text-sm text-gray-600 bg-white rounded-xl px-5 py-4 border-2 border-gray-200">
            <span className="font-semibold">Quick links:</span>{' '}
            <a className="text-orange-600 hover:text-orange-700 font-medium underline" href="/terms">Terms</a> · 
            <a className="text-orange-600 hover:text-orange-700 font-medium underline" href="/information/shipping-returns">Shipping Policy</a> · 
            <a className="text-orange-600 hover:text-orange-700 font-medium underline" href="/information/payment-protection">Payment Protection</a> · 
            <a className="text-orange-600 hover:text-orange-700 font-medium underline" href="/support">Contact</a>
          </div>
        </div>
      </Section>
    </div>
  );
}
