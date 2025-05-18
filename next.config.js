/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const isGithubActions = process.env.GITHUB_ACTIONS || false;

let assetPrefix = '';
let basePath = '';

if (isGithubActions) {
  // Trim off `<owner>/`
  const repo = process.env.GITHUB_REPOSITORY.replace(/.*?\//, '');
  assetPrefix = `/${repo}/`;
  basePath = `/${repo}`;
}

const nextConfig = {
  reactStrictMode: false, // Disable strict mode due to react-beautiful-dnd issues
  assetPrefix: assetPrefix,
  basePath: basePath,
  images: {
    unoptimized: true, // Required for static export
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Konfigurasi environment variables
  env: {
    // Fallback value untuk Gemini API key bila variabel lingkungan tidak tersedia
    NEXT_PUBLIC_GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
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