import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Populate with allowed remote hosts once product image sources
    // (Supabase Storage bucket, CJ CDN, etc.) are finalized.
    remotePatterns: [],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
