const nextConfig = {
  ...(process.env.BUILD_MODE === 'export' ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },

};

module.exports = nextConfig;
