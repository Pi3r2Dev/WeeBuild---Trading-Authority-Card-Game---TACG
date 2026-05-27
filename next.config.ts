import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Build standalone (`.next/standalone/server.js`) → image Docker minimale
  // (`node server.js`), pattern observé sur les apps Coolify voisines.
  output: "standalone",
  // Packages server-side qui ne doivent PAS être bundlés par le tracer Next :
  // `pg` (driver natif, sockets TCP) et l'adapter Prisma. Sans ça le
  // tree-shaking standalone peut casser le driver à l'exécution (cf. lib/db.ts).
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
};

export default nextConfig;
