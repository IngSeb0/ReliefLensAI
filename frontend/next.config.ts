import type { NextConfig } from "next";
import path from "node:path";

const backendOrigin = process.env.BACKEND_ORIGIN || "http://localhost:8080";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
