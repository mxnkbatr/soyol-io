/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production' || !!process.env.NEXT_PUBLIC_BASE_URL;
const allowedOrigin = isProd ? "https://soyol-io.vercel.app" : "http://localhost:3000";

const nextConfig = {
  allowedDevOrigins: [
    "192.168.1.225",
    "192.168.1.225:3000",
    "192.168.1.152",
    "192.168.1.152:3000",
    "192.168.1.211",
    "0.0.0.0",
  ],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: allowedOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, PATCH, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Cookie" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
      {
        source: "/(.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico|woff2))",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "graph.facebook.com" },
      { protocol: "https", hostname: "**.vercel.app" },
    ],
    loader: "custom",
    loaderFile: "./lib/imageLoader.ts",
    minimumCacheTTL: 604800,
    deviceSizes: [384, 640, 828, 1080],
    imageSizes: [64, 128, 256],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    optimizePackageImports: ['lucide-react', 'framer-motion', 'react-hot-toast'],
  },
};

module.exports = nextConfig;