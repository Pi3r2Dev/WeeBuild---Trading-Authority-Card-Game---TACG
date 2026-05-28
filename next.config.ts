import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Build standalone (`.next/standalone/server.js`) → image Docker minimale
  // (`node server.js`), pattern observé sur les apps Coolify voisines.
  output: "standalone",
  // Packages server-side qui ne doivent PAS être bundlés par le tracer Next :
  // `pg` (driver natif, sockets TCP) et l'adapter Prisma. Sans ça le
  // tree-shaking standalone peut casser le driver à l'exécution (cf. lib/db.ts).
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  // Stubs prod pour outils R&D (leva, r3f-perf) déclarés en devDependencies.
  webpack: (config, { dev }) => {
    if (!dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        leva: path.resolve("./lib/r3f/stubs/leva.ts"),
        "r3f-perf": path.resolve("./lib/r3f/stubs/r3f-perf.tsx"),
      };
    }
    return config;
  },
};

export default nextConfig;
