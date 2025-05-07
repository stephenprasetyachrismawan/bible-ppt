/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  reactStrictMode: false, // Disable strict mode due to react-beautiful-dnd issues
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  
  webpack: (config, { isServer }) => {
    // Handle Node.js modules in the browser
    if (!isServer) {
      // Fallbacks for Node.js core modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        'fs/promises': false,
        path: false,
        os: false,
        https: false,
        http: false,
        zlib: false,
        stream: false,
        buffer: false,
        crypto: false,
      };
      
      // Ignore Node.js imports in pptxgenjs
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /node:(fs|https|http|fs\/promises|path|os|zlib|stream|buffer|crypto)/,
          (resource) => {
            resource.request = resource.request.replace(/^node:/, '');
          }
        )
      );
    }
    
    return config;
  },
};

module.exports = nextConfig; 