import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone", // wajib untuk image Docker ramping (tanpa node_modules penuh)
};

export default nextConfig;
