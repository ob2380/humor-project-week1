import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Matches the 5MB avatar limit enforced in app/profile/actions.ts.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
