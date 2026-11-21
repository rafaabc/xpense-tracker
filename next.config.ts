import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Dashboard was removed; keep old bookmarks / installed PWAs working
      { source: "/dashboard", destination: "/expenses", permanent: true },
    ];
  },
};

export default nextConfig;
