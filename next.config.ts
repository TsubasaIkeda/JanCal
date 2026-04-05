import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ["JanCal.local", "*.local", "192.168.*.*"],
};

export default nextConfig;
