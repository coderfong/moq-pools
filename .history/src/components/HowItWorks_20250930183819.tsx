import SectionTitle from '@/components/ui/SectionTitle';

export default function HowItWorks() {
  const steps = [
    { title: 'Browse', body: 'Find curated wholesale listings across platforms.', icon: '🔎' },
    { title: 'Join', body: 'Pledge your quantity to pool with other buyers.', icon: '🤝' },
    { title: 'Auto‑order', body: 'Once MOQ is met, orders trigger automatically.', icon: '✅' },
  ];
  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16" data-reveal>
      <div className="px-6 md:px-10 xl:px-16 py-12">
        <SectionTitle eyebrow="How it works" title="Buy together. Save together." center subtitle="Simple steps to unlock factory pricing." />
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <div key={i} className="rounded-2xl bg-card border-hairline p-5">
              <div className="text-3xl">{s.icon}</div>
              <div className="mt-2 font-semibold">{s.title}</div>
              <p className="text-sm text-muted mt-1">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
