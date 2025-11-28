/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			// Alibaba and 1688 image CDNs
			{ protocol: 'https', hostname: '*.alibaba.com' },
			{ protocol: 'https', hostname: 'img.alicdn.com' },
			{ protocol: 'https', hostname: '*.alicdn.com' },
			{ protocol: 'https', hostname: '*.1688.com' },
			{ protocol: 'https', hostname: 'cbu01.alicdn.com' },
			// IndiaMART image/CDN domains
			{ protocol: 'https', hostname: '*.indiamart.com' },
			{ protocol: 'https', hostname: '*.imimg.com' },
			// Made-in-China
			{ protocol: 'https', hostname: '*.made-in-china.com' },
			{ protocol: 'https', hostname: '*.micstatic.com' },
			// Global Sources
			{ protocol: 'https', hostname: '*.globalsources.com' },
			// Generic fallbacks commonly used by these platforms
			{ protocol: 'https', hostname: 'sc01.alicdn.com' },
			{ protocol: 'https', hostname: 'sc02.alicdn.com' },
			{ protocol: 'https', hostname: 'sc03.alicdn.com' },
			{ protocol: 'https', hostname: 'sc04.alicdn.com' },
		],
	},
	// Production Security Headers
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'X-Frame-Options',
						value: 'DENY',
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff',
					},
					{
						key: 'X-XSS-Protection',
						value: '1; mode=block',
					},
					{
						key: 'Referrer-Policy',
						value: 'origin-when-cross-origin',
					},
					{
						key: 'Permissions-Policy',
						value: 'camera=(), microphone=(), geolocation=()',
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=31536000; includeSubDomains',
					},
				],
			},
		];
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
};

export default nextConfig;