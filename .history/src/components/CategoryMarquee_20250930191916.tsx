export default function CategoryMarquee() {
  const cats = [
    { name: 'Electronics', icon: '🔌', img: '/icons/electronics.svg' },
    { name: 'Beauty', icon: '💄', img: '/icons/beauty.svg' },
    { name: 'Home', icon: '🏠', img: '/icons/home.svg' },
    { name: 'DTC', icon: '🛍️', img: '/icons/dtc.svg' },
    { name: 'Bulk Deals', icon: '📦', img: '/icons/bulk.svg' },
    { name: 'Apparel', icon: '👕', img: '/icons/apparel.svg' },
    { name: 'Kitchen', icon: '🍳', img: '/icons/kitchen.svg' },
    { name: 'Gadgets', icon: '📱', img: '/icons/gadgets.svg' },
    { name: 'Office', icon: '🗂️', img: '/icons/office.svg' },
    { name: 'Outdoor', icon: '🏕️', img: '/icons/outdoor.svg' },
  ];
  const list = [...cats, ...cats, ...cats];
  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16" data-reveal>
      <div className="px-6 md:px-10 xl:px-16 py-5 overflow-hidden group">
        <div className="flex items-center gap-4 whitespace-nowrap marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none text-base md:text-lg">
          {list.map((c, i) => (
            <span key={i} className="px-4 py-2 rounded-full border-hairline bg-white/80 dark:bg-gray-900/80 backdrop-blur text-gray-900 dark:text-white inline-flex items-center gap-2">
              {c.img ? <img src={c.img} alt="" className="h-5 w-5" /> : <span aria-hidden>{c.icon}</span>}
              <span>{c.name}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
