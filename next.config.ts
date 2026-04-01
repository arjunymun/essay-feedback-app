import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
