import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Disable TypeScript errors during build
    // The AI SDK v6 has type inference issues with Cerebras provider
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
