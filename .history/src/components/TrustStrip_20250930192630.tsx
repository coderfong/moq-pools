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
      <div className="px-6 md:px-10 xl:px-16 py-10 bg-surface border-t border-b border-hairline">
        <div className="text-xs md:text-sm text-muted">Sourced from:</div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 md:gap-10 items-end">
          {items.map((x) => (
            <div key={x.name} className="flex flex-col items-center text-center">
              <div className="h-12 md:h-14 flex items-center justify-center">
                <img src={x.logo} alt="" className="max-h-12 md:max-h-14 object-contain" />
              </div>
              <div className="mt-2 text-sm md:text-base text-gray-800 dark:text-gray-200">{x.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
