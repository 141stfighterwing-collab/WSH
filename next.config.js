/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Allow loading images from any domain
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Webpack config for better compatibility
  webpack: (config, { isServer }) => {
    // Fix for Prisma
    if (isServer) {
      config.externals = [...(config.externals || []), '@prisma/client'];
    }
    return config;
  },
}

module.exports = nextConfig
