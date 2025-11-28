export default function TrustStrip() {
  const items = [
    { name: 'Alibaba', logo: '/logos/alibaba.png' },
    { name: 'AliExpress', logo: '/logos/aliexpress.png' },
    { name: '1688', logo: '/logos/1688.png' },
    { name: 'Taobao', logo: '/logos/taobao.png' },
    { name: 'Made‑in‑China', logo: '/logos/madeinchina.png' },
  ];
  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16" data-reveal>
      <div className="px-6 md:px-10 xl:px-16 py-8 bg-surface border-t border-b border-hairline">
        <div className="text-xs text-muted">Sourced from:</div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {items.map((x) => (
            <div key={x.name} className="px-3 py-1.5 rounded-full bg-white/70 dark:bg-gray-900/70 backdrop-blur border-hairline inline-flex items-center gap-2">
              <img src={x.logo} alt="" className="h-5 w-5 object-contain" />
              <span className="text-sm text-gray-800 dark:text-gray-200">{x.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
