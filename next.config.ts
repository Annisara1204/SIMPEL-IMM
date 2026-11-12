import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // 10 MB mandate PDF + multipart boundaries; photos have a separate 5 MB limit.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
