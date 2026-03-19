/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    turbo: false,
  },
  webpack: (config, options) => {
    // ensure webpack mode is used explicitly
    return config
  },
}

export default nextConfig
