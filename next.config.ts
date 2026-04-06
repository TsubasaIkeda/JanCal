import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** ホーム直下など別の lockfile があると Turbopack が誤ったルートを選ぶため、このプロジェクトを明示する */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
