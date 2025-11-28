export default function TrustStrip() {
  const items = [
    { name: 'Alibaba', logo: '/logos/alibaba.png' },
    { name: 'Made-in-China', logo: '/logos/madeinchina.png' },
    { name: 'IndiaMART', logo: '/logos/indiamart.png' },
  ];
  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16" data-reveal>
      <div className="px-6 md:px-10 xl:px-16 py-10 bg-surface border-t border-b border-hairline text-center">
        <div className="text-lg md:text-xl font-semibold text-muted-foreground">Sourced from trusted suppliers</div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 place-items-center mx-auto max-w-4xl md:max-w-5xl">
          {items.map((x) => (
            <div key={x.name} className="flex flex-col items-center text-center">
              <div className="h-12 md:h-16 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.logo} alt="" loading="lazy" className="max-h-12 md:max-h-16 object-contain" />
              </div>
              <div className="mt-1 text-lg md:text-xl font-semibold text-foreground">{x.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
