/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.BUILD_MODE === 'export' ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
    async rewrites() {
    return [
      {
        source: "/api/overpass",
        destination: "https://overpass-api.de/api/interpreter",
      },
    ];
  },
};

module.exports = nextConfig;