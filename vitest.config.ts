import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tests unitaires Node (clients de service, garde SSRF). Pas de DOM : on mocke
// `fetch` et `node:dns`. Alias `@` aligné sur tsconfig (`@/*` → racine).
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // Valeur par défaut pour les tests ; surchargée par test au besoin.
    env: {
      FIRECRAWL_API_URL: "http://firecrawl.test",
      // Placeholder : certains modules (ex. gsc.ts) importent lib/db au chargement.
      DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test?schema=public",
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
