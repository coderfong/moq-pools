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
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] md:text-xs font-medium backdrop-blur bg-black/5 text-gray-900 dark:bg-white/15 dark:text-white">
            <span>Group-buy platform</span>
            <span className="opacity-80">Better prices together</span>
          </div>
          <h3 className="mt-3 font-display text-lg md:text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Join MOQ Pools & save on wholesale buys
          </h3>
          <div className="mt-2 text-xs md:text-sm text-muted dark:text-gray-400">Sourced from:</div>
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 md:gap-10 items-end">
          {items.map((x) => (
            <div key={x.name} className="flex flex-col items-center text-center">
              <div className="h-12 md:h-14 flex items-center justify-center">
                <img src={x.logo} alt="" loading="lazy" className="max-h-12 md:max-h-14 object-contain" />
              </div>
              <div className="mt-2 text-sm md:text-base text-gray-800 dark:text-gray-200">{x.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
