import { resolve } from "node:path";
import dotenv from "dotenv";
import type { NextConfig } from "next";

dotenv.config({
  path: resolve(process.cwd(), "../../.env"),
  quiet: true,
});

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.API_ORIGIN ??
      "http://localhost:4000",
  },
  output: "standalone",
  outputFileTracingRoot: resolve(process.cwd(), "../.."),
  reactStrictMode: true,
};

export default nextConfig;
