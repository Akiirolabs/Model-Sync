import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@model-sync/ui", "@model-sync/core", "@model-sync/connectors"],
};

export default nextConfig;
