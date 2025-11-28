export default function TrustStrip() {
  const items = ['Alibaba','AliExpress','1688','Taobao','Made‑in‑China'];
  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16" data-reveal>
      <div className="px-6 md:px-10 xl:px-16 py-8 bg-surface border-t border-b border-hairline">
        <div className="text-xs text-muted">Sourced from:</div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {items.map((x) => (
            <div key={x} className="text-sm px-3 py-1.5 rounded-full bg-white/70 dark:bg-gray-900/70 backdrop-blur border-hairline">{x}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
