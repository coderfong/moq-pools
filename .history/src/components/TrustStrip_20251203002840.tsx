export default function TrustStrip() {
  const items = [
    { name: 'Alibaba', logo: '/logos/alibaba.png' },
    { name: 'Made-in-China', logo: '/logos/madeinchina.png' },
    { name: 'IndiaMART', logo: '/logos/indiamart.png' },
  ];
  return (
    <section data-reveal>
      <div className="container mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-10 bg-surface border-t border-b border-hairline text-center">
        <div className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-muted-foreground">Sourced from trusted suppliers</div>
        <div className="mt-4 sm:mt-5 md:mt-6 flex flex-row justify-center items-center gap-6 sm:gap-8 md:gap-10 lg:gap-12 mx-auto max-w-5xl">
          {items.map((x) => (
            <div key={x.name} className="flex flex-col items-center text-center">
              <div className="h-10 sm:h-12 md:h-14 lg:h-16 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.logo} alt="" loading="lazy" className="max-h-10 sm:max-h-12 md:max-h-14 lg:max-h-16 object-contain" />
              </div>
              <div className="mt-1 text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-foreground">{x.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
