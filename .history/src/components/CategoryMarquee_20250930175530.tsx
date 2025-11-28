export default function CategoryMarquee() {
  const cats = ['Electronics','Beauty','Home','DTC','Bulk Deals','Apparel','Kitchen','Gadgets','Office','Outdoor'];
  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16" data-reveal>
      <div className="px-6 md:px-10 xl:px-16 py-4 overflow-hidden group">
        <div className="flex items-center gap-3 whitespace-nowrap marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[...cats, ...cats].map((c, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full border-hairline bg-white/80 dark:bg-gray-900/80 backdrop-blur text-sm">{c}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
