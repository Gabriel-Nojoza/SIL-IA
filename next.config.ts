import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Binário nativo: não pode ser empacotado pelo webpack
  serverExternalPackages: ["@duckdb/node-api", "@duckdb/node-bindings"],
};

module.exports = withPWA(nextConfig);
