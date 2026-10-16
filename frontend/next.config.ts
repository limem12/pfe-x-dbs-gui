import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Avoid double mount in dev.
};

export default nextConfig;
