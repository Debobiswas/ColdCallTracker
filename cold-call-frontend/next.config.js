/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/:path*',
      },
    ]
  },
  // Enable static export
  output: 'standalone',
  // Configure base path if needed
  basePath: '',
  // Configure asset prefix if needed
  assetPrefix: '',
  // Disable server-side rendering for static paths
  trailingSlash: true,
  // Handle 404s properly
  async redirects() {
    return []
  },
  // Enable image optimization
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig 