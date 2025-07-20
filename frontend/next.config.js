/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*'
      }
    ]
  },
  env: {
    PORT: process.env.PORT || '3001'
  },
  experimental: {
    serverComponentsExternalPackages: []
  },
  // Configuración para Railway
  output: 'standalone',
  poweredByHeader: false,
  compress: true
}

module.exports = nextConfig 