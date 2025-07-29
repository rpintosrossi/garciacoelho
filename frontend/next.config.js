/** @type {import('next').NextConfig} */

const isProduction = process.env.NODE_ENV === 'production';

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
  
  // Asegurar que los assets se sirvan desde la URL correcta en producción
  assetPrefix: isProduction ? 'https://garciacoelho-production.up.railway.app' : undefined,

  // Configuración del servidor
  experimental: {
    serverComponentsExternalPackages: []
  }
}

module.exports = nextConfig 