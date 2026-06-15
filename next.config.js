/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  transpilePackages: ['lunar-javascript'],
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;