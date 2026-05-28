import { describe, it, expect, beforeEach } from "vitest";
import { MemoryVisualAssetStore } from "./memory-visual-asset-store";
import { sha256Hex } from "./content-hash";

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("MemoryVisualAssetStore", () => {
  let store: MemoryVisualAssetStore;

  beforeEach(() => {
    store = new MemoryVisualAssetStore();
  });

  it("put puis read round-trip", async () => {
    const hash = sha256Hex(PNG_1x1);
    const result = await store.put({
      siteId: "site-a",
      kind: "logo",
      bytes: PNG_1x1,
      mime: "image/png",
      contentHash: hash,
    });

    expect(result.deduplicated).toBe(false);
    expect(result.publicUrl).toContain(hash);

    const bytes = await store.read(result.storageKey);
    expect(bytes?.equals(PNG_1x1)).toBe(true);
    expect(store.verifyHash(hash)).toBe(true);
  });

  it("déduplique par contentHash (second site)", async () => {
    const hash = sha256Hex(PNG_1x1);
    const first = await store.put({
      siteId: "site-a",
      kind: "logo",
      bytes: PNG_1x1,
      mime: "image/png",
      contentHash: hash,
    });
    const second = await store.put({
      siteId: "site-b",
      kind: "hero",
      bytes: PNG_1x1,
      mime: "image/png",
      contentHash: hash,
    });

    expect(second.deduplicated).toBe(true);
    expect(second.storageKey).toBe(first.storageKey);
  });
});
