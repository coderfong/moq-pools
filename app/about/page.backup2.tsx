import React from "react";
import Link from "next/link";
import Image from "next/image";
import stripeLogo from "../../company logos/stripe.png";

export const metadata = {
  title: "About Us | MOQ Pools",
  description:
    "We help small buyers and creators team up to reach factory MOQs and unlock wholesale pricing — fair for factories, accessible for everyone.",
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
    "name": "About MOQPools",
    "url": `${siteUrl}/about`,
    "isPartOf": {
      "@type": "WebSite",
      "name": "MOQPools",
      "url": siteUrl,
      "publisher": {
        "@type": "Organization",
        "name": "MOQPools",
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
              <span aria-hidden className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white text-2xl shadow-lg shadow-orange-500/30">🧠</span>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">About Us</h1>
            </div>
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                Making factory‑direct access <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">easy for everyone.</span>
              </h2>
              <p className="mt-4 text-base sm:text-lg text-gray-700 leading-relaxed">
                We believe everyone — not just big brands — should be able to buy factory‑direct without worrying about high
                minimum order quantities (MOQ). Our platform helps small buyers and entrepreneurs team up to unlock bulk
                discounts usually reserved for wholesalers.
              </p>
              <div className="mt-6 flex items-center gap-3 flex-wrap">
                <Link href="/products" className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300">
                  Explore group buys →
                </Link>
                <a href="/how-it-works" className="rounded-full border-2 border-orange-200 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-orange-50 hover:border-orange-300 transition-all duration-300">
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
          <div className="rounded-2xl border-2 border-orange-200/50 bg-gradient-to-br from-orange-50/50 to-amber-50/30 p-6 shadow-sm">
            <p className="text-base leading-relaxed text-gray-800">
              It started with a frustration: factories wanted us to order 100+ units just to get a fair price — but we only needed five.
              We realized thousands of buyers around the world faced the same problem.
            </p>
            <p className="mt-3 text-base leading-relaxed text-gray-800">
              So we built <span className="font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">MOQ Pools</span> — a system that lets everyday people pool demand together, meet factory MOQs, and share the savings.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
            <span className="text-lg">🇸🇬</span>
            <span>Founded in Singapore. Built for a global buyer community.</span>
          </div>
        </div>
      </Section>

      {/* Why MOQ Pooling Matters */}
      <Section id="why" title="Why MOQ Pooling Matters">
        <div className="grid gap-3 md:grid-cols-3">
          {[{
            icon: '🏭',
            title: 'Factories Deserve Fair Orders',
            desc: 'Manufacturers can’t produce one‑off pieces — pooling ensures production is efficient and profitable for them.',
          },{
            icon: '👩‍💻',
            title: 'Small Buyers Deserve Access',
            desc: 'Startups, creators, and individuals can finally buy like big companies without waste or markups.',
          },{
            icon: '🌱',
            title: 'Sustainability by Demand',
            desc: 'Group orders reduce overproduction and excess inventory — better for everyone and the planet.',
          }].map((b, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="text-2xl" aria-hidden>{b.icon}</div>
              <div className="mt-2 text-sm font-medium text-neutral-900">{b.title}</div>
              <div className="mt-1 text-sm text-neutral-700">{b.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
          <blockquote className="text-neutral-700 italic">“MOQ pooling isn’t just about price — it’s about fair access and smarter manufacturing.”</blockquote>
        </div>
      </Section>

      {/* Founding Team */}
      <Section id="team" title="The Founding Team">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {[{
            name: '',
            role: 'Founder',
            bio: 'Building a fair, factory‑direct marketplace for small buyers and creators.',
            links: { linkedin: '', twitter: '' }
          },{
            name: '',
            role: 'Co‑founder (Hiring)',
            bio: 'We’re assembling a small, senior team across supply, product, and engineering.',
            links: { linkedin: '', twitter: '' }
          },{
            name: '',
            role: 'Advisor / Partner',
            bio: 'If you’re a 3PL or factory partner, reach out to collaborate.',
            links: { linkedin: '', twitter: '' }
          }].map((p, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center text-xs text-neutral-500" aria-hidden>IMG</div>
                <div>
                  <div className="text-sm font-medium text-neutral-900">{p.name || '—'}</div>
                  <div className="text-xs text-neutral-600">{p.role}</div>
                </div>
              </div>
              <div className="mt-2 text-sm text-neutral-700">{p.bio}</div>
              {(p.links?.linkedin || p.links?.twitter) && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {p.links.linkedin ? <a className="underline" href={p.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a> : null}
                  {p.links.twitter ? <a className="underline" href={p.links.twitter} target="_blank" rel="noopener noreferrer">Twitter</a> : null}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3">
          <a href="/register" className="inline-flex items-center rounded-full border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">📬 We’re hiring — join our mission →</a>
        </div>
      </Section>

      {/* Vision & Future */}
      <Section id="vision" title="Our Vision & Future">
        <div className="space-y-2">
          <p>We’re building a world where anyone can source like a brand — safely, transparently, and affordably.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Launch regional fulfillment hubs for faster global delivery.</li>
            <li>Expand verified factory partnerships across Asia.</li>
            <li>Introduce “instant MOQ sharing” — real‑time matchmaking for buyers of the same item.</li>
          </ul>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[{ y: '2024', t: 'Platform launched' }, { y: '2025', t: 'Reached 10,000 group buyers' }, { y: '2026', t: 'Global shipping coverage (US, EU, SEA)' }].map((m, i) => (
              <div key={i} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                <div className="text-neutral-900 font-medium">{m.y}</div>
                <div className="text-neutral-700">{m.t}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Behind-the-Scenes / Credibility Proof */}
      <Section id="proof" title="Behind‑the‑Scenes / Credibility">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="text-sm font-medium text-neutral-900">Factory onboarding</div>
            <div className="mt-1 text-sm text-neutral-700">We verify suppliers and share more process details as we grow.</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="text-sm font-medium text-neutral-900">Fulfillment partners</div>
            <div className="mt-2 flex items-center gap-4">
              <Image src={stripeLogo} alt="Stripe" width={64} height={24} className="h-6 w-auto" />
              <Image src={paypalLogo} alt="PayPal" width={64} height={24} className="h-6 w-auto" />
            </div>
            <div className="mt-1 text-xs text-neutral-500">Logos shown are for identification only. Partners vary by region.</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5">Verified Supplier Network</span>
              <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5">Secure Payments via Stripe</span>
              <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5">3PL partnerships</span>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="text-sm font-medium text-neutral-900">Buyer success stories</div>
            <div className="mt-1 text-sm text-neutral-700">We’ll highlight real buyer stories and media mentions here.</div>
          </div>
        </div>
      </Section>

      {/* Connect With Us */}
      <Section id="connect" title="Connect With Us">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <a href="/account/messages" className="rounded-lg bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800">Message us</a>
            <a href="mailto:chaibotsg@gmail.com" className="rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50">Email</a>
            <a href="tel:+6594799717" className="rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50">Call: +65 9479 9717</a>
            <a href="/support" className="rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50">Support</a>
          </div>
          <div className="text-xs text-neutral-500">
            Quick links: <a className="underline" href="/terms">Terms</a> · <a className="underline" href="/information/shipping-returns">Shipping Policy</a> · <a className="underline" href="/information/payment-protection">Payment Protection</a> · <a className="underline" href="/support">Contact</a>
          </div>
        </div>
      </Section>
    </div>
  );
}
