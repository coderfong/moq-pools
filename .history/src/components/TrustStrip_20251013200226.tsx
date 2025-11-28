export default function TrustStrip() {
  const items = [
    { name: 'Alibaba', logo: '/logos/alibaba.png' },
    { name: 'Made-in-China', logo: '/logos/madeinchina.png' },
    { name: 'IndiaMART', logo: '/logos/indiamart.png' },
  ];
  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16" data-reveal>
      <div className="px-6 md:px-10 xl:px-16 py-10 bg-surface border-t border-b border-hairline text-center">
        <div className="text-xl md:text-2xl font-semibold text-muted dark:text-gray-300">Sourced from trusted suppliers</div>
  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 place-items-center mx-auto max-w-4xl md:max-w-5xl">
          {items.map((x) => (
            <div key={x.name} className="flex flex-col items-center text-center">
              <div className="h-28 md:h-32 flex items-center justify-center">
                <img src={x.logo} alt="" loading="lazy" className="max-h-28 md:max-h-32 object-contain" />
              </div>
              <div className="mt-1 text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100">{x.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
