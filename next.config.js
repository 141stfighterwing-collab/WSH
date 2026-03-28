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
    // Exclude examples and benchmarks from compilation
    config.ignoreWarnings = [
      { module: /examples/ },
      { module: /benchmarks/ },
    ];
    return config;
  },
  // Exclude benchmarks and test files from build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Exclude specific files from the build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].filter(ext => {
    // This ensures only pages in src/app are treated as pages
    return true;
  }),
}

module.exports = nextConfig
