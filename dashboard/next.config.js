/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  async redirects() {
    return [
      { source: '/dashboard', destination: '/', permanent: true },
      { source: '/dashboard/:path*', destination: '/:path*', permanent: true },
      { source: '/shift-locations', destination: '/branches', permanent: false },
      { source: '/shift-locations/:path*', destination: '/branches', permanent: false },
    ]
  },
}

module.exports = nextConfig
