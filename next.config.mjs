import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
	// Enable compression for better performance
	compress: true,
	// Enable optimized package imports
	modularizeImports: {
		'@/components': {
			transform: '@/components/{{member}}',
		},
	},
	// Optimize production builds
	swcMinify: true,
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
			// Placeholder images
			{ protocol: 'https', hostname: 'placehold.co' },
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
						value: 'strict-origin-when-cross-origin',
					},
					{
						key: 'Permissions-Policy',
						value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()',
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=31536000; includeSubDomains; preload',
					},
					{
						key: 'Content-Security-Policy',
						value: `
							default-src 'self';
							script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com https://static.cloudflareinsights.com https://browser.sentry-cdn.com;
							style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
							font-src 'self' https://fonts.gstatic.com;
							img-src 'self' data: blob: https: http:;
							connect-src 'self' https://api.stripe.com https://challenges.cloudflare.com https://cloudflareinsights.com wss: ws:;
							frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com;
							frame-ancestors 'none';
							object-src 'none';
							base-uri 'self';
							form-action 'self';
							manifest-src 'self';
							media-src 'self' blob: data:;
							worker-src 'self' blob:;
							upgrade-insecure-requests;
						`.replace(/\s+/g, ' ').trim(),
					},
					{
						key: 'Expect-CT',
						value: 'max-age=86400, enforce',
					},
					{
						key: 'Cross-Origin-Embedder-Policy',
						value: 'credentialless',
					},
					{
						key: 'Cross-Origin-Opener-Policy',
						value: 'same-origin',
					},
					{
						key: 'Cross-Origin-Resource-Policy',
						value: 'cross-origin',
					},
					{
						key: 'X-Robots-Tag',
						value: 'index, follow',
					},
					{
						key: 'X-Powered-By',
						value: 'MOQ-Pools',
					},
				],
			},
			// API route specific headers
			{
				source: '/api/:path*',
				headers: [
					{
						key: 'X-API-Version',
						value: '1.0',
					},
					{
						key: 'Cache-Control',
						value: 'no-store, no-cache, must-revalidate',
					},
				],
			},
			// Cache static assets aggressively
			{
				source: '/_next/static/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable',
					},
				],
			},
			{
				source: '/cache/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=86400, stale-while-revalidate=604800',
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

// Sentry configuration options
const sentryWebpackPluginOptions = {
	// For all available options, see:
	// https://github.com/getsentry/sentry-webpack-plugin#options

	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,

	// Only print logs for uploading source maps in CI
	silent: !process.env.CI,

	// For all available options, see:
	// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

	// Upload a larger set of source maps for prettier stack traces (increases build time)
	widenClientFileUpload: true,

	// Automatically annotate React components to show their full name in breadcrumbs and session replay
	reactComponentAnnotation: {
		enabled: true,
	},

	// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
	// This can increase your server load as well as your hosting bill.
	// Note: Check that the Sentry DSN uses a publicly accessible URL.
	tunnelRoute: '/monitoring',

	// Hides source maps from generated client bundles
	hideSourceMaps: true,

	// Automatically tree-shake Sentry logger statements to reduce bundle size
	disableLogger: true,

	// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
	// See the following for more information:
	// https://docs.sentry.io/product/crons/
	// https://vercel.com/docs/cron-jobs
	automaticVercelMonitors: true,
};

// Make sure adding Sentry options is the last code to run before exporting
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);