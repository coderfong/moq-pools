export default function CategoryMarquee() {
  const cats = [
    { name: 'Electronics', icon: '🔌' },
    { name: 'Beauty', icon: '💄' },
    { name: 'Home', icon: '🏠' },
    { name: 'DTC', icon: '🛍️' },
    { name: 'Bulk Deals', icon: '📦' },
    { name: 'Apparel', icon: '👕' },
    { name: 'Kitchen', icon: '🍳' },
    { name: 'Gadgets', icon: '📱' },
    { name: 'Office', icon: '🗂️' },
    { name: 'Outdoor', icon: '🏕️' },
  ];
  const list = [...cats, ...cats];
  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16" data-reveal>
      <div className="px-6 md:px-10 xl:px-16 py-4 overflow-hidden group">
        <div className="flex items-center gap-3 whitespace-nowrap marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {list.map((c, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full border-hairline bg-white/80 dark:bg-gray-900/80 backdrop-blur text-sm text-gray-900 dark:text-white inline-flex items-center gap-2">
              <span aria-hidden>{c.icon}</span>
              <span>{c.name}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
