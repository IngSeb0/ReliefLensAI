import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://134.199.203.136:8080/:path*",
      },
    ];
  },
};

export default nextConfig;
