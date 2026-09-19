import type { NextConfig } from "next";

// Produksi: ketat. Dev: React dev mode butuh eval() untuk rekonstruksi callstack,
// jadi 'unsafe-eval' hanya ditambahkan saat NODE_ENV !== "production".
const DEV = process.env.NODE_ENV !== "production";

// CSP produksi: runtime Next menyuntikkan script & style inline, jadi keduanya
// butuh 'unsafe-inline'. Tidak memakai CDN eksternal (aset self + data/blob).
const scriptSrc = ["'self'", "'unsafe-inline'", ...(DEV ? ["'unsafe-eval'"] : [])].join(" ");

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // ws:/wss: dibutuhkan WebSocket HMR turbopack di dev; produksi tidak.
  DEV ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone", // wajib untuk image Docker ramping (tanpa node_modules penuh)

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
