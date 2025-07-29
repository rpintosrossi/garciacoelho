/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  // Configuración para Railway
  output: 'standalone',
  poweredByHeader: false,
  // Configuración del servidor
  experimental: {
    serverComponentsExternalPackages: []
  }
}

module.exports = nextConfig 