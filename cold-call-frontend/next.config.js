/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable static export
  output: 'standalone',
  // Configure base path if needed
  basePath: '',
  // Configure asset prefix if needed
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // Handle trailing slashes
  trailingSlash: true,
  // Disable TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true
  },
  // Enhanced error handling and redirects
  async redirects() {
    return [
      {
        source: '/404',
        destination: '/not-found',
        permanent: true,
      },
    ]
  },
  // Image optimization settings
  images: {
    unoptimized: false,
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Enhanced security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ],
      },
    ]
  },

}

module.exports = nextConfig 