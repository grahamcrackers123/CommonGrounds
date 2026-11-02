import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  serverExternalPackages: ["pdf-parse"],

  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;