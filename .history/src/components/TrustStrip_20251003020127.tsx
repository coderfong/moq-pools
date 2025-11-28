export default function TrustStrip() {
  const items = [
    { name: 'Alibaba', logo: '/logos/alibaba.png' },
    { name: '1688', logo: '/logos/1688.png' },
    { name: 'Made-in-China', logo: '/logos/madeinchina.png' },
    { name: 'IndiaMART', logo: '/logos/indiamart.svg' },
  ];
  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16" data-reveal>
      <div className="px-6 md:px-10 xl:px-16 py-10 bg-surface border-t border-b border-hairline">
        <div className="text-center text-xs md:text-sm text-muted dark:text-gray-400">Sourced from:</div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 md:gap-12 items-end">
          {items.map((x) => (
            <div key={x.name} className="flex flex-col items-center text-center">
              <div className="h-16 md:h-20 flex items-center justify-center">
                <img src={x.logo} alt="" loading="lazy" className="max-h-16 md:max-h-20 object-contain" />
              </div>
              <div className="mt-2 text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">{x.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
