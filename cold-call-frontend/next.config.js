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
}

module.exports = nextConfig 