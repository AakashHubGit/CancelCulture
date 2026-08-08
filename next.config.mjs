/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api-assets.clashofclans.com',
      },
    ],
  },
};

export default nextConfig;
