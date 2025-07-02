module.exports = {
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/:path*',
      },
    ]
  },
} 