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
  // Configuración específica para Railway
  serverExternalPackages: [],
  // Asegurar que Next.js escuche en todas las interfaces
  serverRuntimeConfig: {
    hostname: '0.0.0.0',
    port: process.env.PORT || 3001
  }
}

module.exports = nextConfig 