import React from "react";
import Link from "next/link";

export const metadata = {
  title: "About Us | MOQ Pools",
  description:
    "We help small buyers and creators team up to reach factory MOQs and unlock wholesale pricing — fair for factories, accessible for everyone.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:py-8">
      <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-neutral-700">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="pb-12">
      {/* Hero */}
      <div className="border-b border-neutral-200 bg-gradient-to-b from-white to-neutral-50">
        <div className="mx-auto w-full max-w-[1000px] px-4 py-10 sm:py-14">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-neutral-900">
              <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-neutral-900 text-white">🧠</span>
              <h1 className="text-3xl font-bold tracking-tight">About Us</h1>
            </div>
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight">Making factory‑direct access easy for everyone.</h2>
              <p className="mt-2 text-sm text-neutral-700">
                We believe everyone — not just big brands — should be able to buy factory‑direct without worrying about high
                minimum order quantities (MOQ). Our platform helps small buyers and entrepreneurs team up to unlock bulk
                discounts usually reserved for wholesalers.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Link href="/products" className="rounded-full bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">Explore group buys →</Link>
                <a href="/how-it-works" className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">How it works</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Our Story */}
      <Section id="story" title="Our Story">
        <div className="space-y-2">
          <p>
            It started with a frustration: factories wanted us to order 100+ units just to get a fair price — but we only needed five.
            We realized thousands of buyers around the world faced the same problem.
          </p>
          <p>
            So we built MOQ Pools — a system that lets everyday people pool demand together, meet factory MOQs, and share the savings.
          </p>
          <p className="text-xs text-neutral-500">Founded in Singapore. Built for a global buyer community.</p>
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
          {[
            { name: 'Jonathan Lee Kai Tan', role: 'Founder', bio: 'Building a fair, factory‑direct marketplace for small buyers and creators.' },
            { name: '—', role: 'Co‑founder (Hiring)', bio: 'We’re assembling a small, senior team across supply, product, and engineering.' },
            { name: '—', role: 'Advisor / Partner', bio: 'If you’re a 3PL or factory partner, reach out to collaborate.' },
          ].map((p, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white" aria-hidden>
                  {p.name.split(' ').map(x => x[0]).slice(0,2).join('')}
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-900">{p.name}</div>
                  <div className="text-xs text-neutral-600">{p.role}</div>
                </div>
              </div>
              <div className="mt-2 text-sm text-neutral-700">{p.bio}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Vision & Future */}
      <Section id="vision" title="Our Vision & Future">
        <div className="space-y-2">
          <p>
            We’re building a trusted bridge between small buyers and great factories. Over time, we’ll expand verified supplier
            coverage, faster consolidation lanes, and regional pickup points — all while keeping buyer protections strong.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Verified factory network with transparent ratings</li>
            <li>Faster cross‑border lanes via 3PL partners</li>
            <li>Buyer tooling for RFQs and repeat orders</li>
          </ul>
        </div>
      </Section>

      {/* Behind-the-Scenes / Credibility Proof */}
      <Section id="proof" title="Behind‑the‑Scenes / Credibility">
        <div className="grid gap-3 md:grid-cols-3">
          {[ 'Factory onboarding', 'Fulfillment partners', 'Buyer success stories' ].map((t, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="text-sm font-medium text-neutral-900">{t}</div>
              <div className="mt-1 text-sm text-neutral-700">We share more on our blog and socials as we grow — including process shots and milestones.</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Connect With Us */}
      <Section id="connect" title="Connect With Us">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <a href="/account/messages" className="rounded-lg bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800">Message us</a>
          <a href="mailto:chaibotsg@gmail.com" className="rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50">Email</a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50">X / Twitter</a>
          <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50">LinkedIn</a>
        </div>
      </Section>
    </div>
  );
}
