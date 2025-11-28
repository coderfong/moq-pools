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
  const isLargePlatform = key === 'INDIAMART' || key === 'MADE_IN_CHINA';
  const textClasses = isLargePlatform ? 'text-lg md:text-xl' : 'text-base';
  const padClasses = isLargePlatform ? 'px-3.5 py-1.5 md:px-4 md:py-2' : 'px-3 py-1.5';
  const iconClasses = isLargePlatform ? 'h-6 w-6 md:h-7 md:w-7' : 'h-5 w-5 md:h-6 md:w-6';
  return (
    <span
      className={`inline-flex items-center gap-2 ${padClasses} rounded-full bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 ${textClasses} text-gray-800 dark:text-gray-100 ${className}`.trim()}
      title={item.label}
      aria-label={item.label}
    >
      {item.logo ? (
        <img src={item.logo} alt="" className={`${iconClasses} object-contain`} />
      ) : null}
      <span className="leading-none">{item.label}</span>
    </span>
  );
}
