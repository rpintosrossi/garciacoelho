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
  experimental: {
    serverComponentsExternalPackages: []
  },
  // Asegurar que Next.js escuche en todas las interfaces
  serverRuntimeConfig: {
    hostname: '0.0.0.0',
    port: process.env.PORT || 3001
  },
  // Configuración para producción
  output: 'standalone',
  poweredByHeader: false
}

module.exports = nextConfig 