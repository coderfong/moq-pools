type PlatformCode = 'ALIBABA'|'ALIEXPRESS'|'C1688'|'TAOBAO'|'MADE_IN_CHINA'|'SEA_LOCAL'|string;

const MAP: Record<string, { label: string; logo?: string }> = {
  ALIBABA: { label: 'Alibaba', logo: '/logos/alibaba.png' },
  ALIEXPRESS: { label: 'AliExpress', logo: '/logos/aliexpress.png' },
  C1688: { label: '1688', logo: '/logos/1688.png' },
  TAOBAO: { label: 'Taobao', logo: '/logos/taobao.png' },
  MADE_IN_CHINA: { label: 'Made‑in‑China', logo: '/logos/madeinchina.png' },
  SEA_LOCAL: { label: 'SEA Local' },
};

export default function PlatformBadge({ code, className = '' }: { code?: PlatformCode | null; className?: string }) {
  const key = String(code || '').toUpperCase();
  const item = MAP[key] || { label: (code || 'Unknown').toString().replace(/_/g, ' ') };
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/70 dark:bg-gray-900/70 border-hairline text-xs text-gray-800 dark:text-gray-200 ${className}`.trim()}>
      {item.logo ? <img src={item.logo} alt="" className="h-4 w-4 object-contain" /> : null}
      <span>{item.label}</span>
    </span>
  );
}
