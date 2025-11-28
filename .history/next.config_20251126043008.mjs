import { withSentryConfig } from '@sentry/nextjs';

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