type PlatformCode = 'ALIBABA' | 'C1688' | 'MADE_IN_CHINA' | 'INDIAMART' | string;

const MAP: Record<string, { label: string; logo?: string }> = {
  ALIBABA: { label: 'Alibaba', logo: '/logos/alibaba.png' },
  C1688: { label: '1688', logo: '/logos/1688.png' },
  MADE_IN_CHINA: { label: 'Made-in-China', logo: '/logos/madeinchina.png' },
  INDIAMART: { label: 'IndiaMART', logo: '/logos/indiamart.png' },
};

export default function PlatformBadge({ code, className = '' }: { code?: PlatformCode | null; className?: string }) {
  const key = String(code || '').toUpperCase();
  const item = MAP[key] || { label: (code || 'Unknown').toString().replace(/_/g, ' ') };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 ${className}`.trim()}
      title={item.label}
      aria-label={item.label}
    >
      {item.logo ? (
        <img src={item.logo} alt="" className="h-4 w-4 md:h-5 md:w-5 object-contain" />
      ) : null}
      <span className="leading-none">{item.label}</span>
    </span>
  );
}
