import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    gscSnapshot: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/gsc", () => ({
  captureGsc: vi.fn(),
  GscError: class GscError extends Error {},
}));

vi.mock("@/lib/authority/gsc-input", () => ({
  getLatestGscInputForSite: vi.fn(),
}));

import { db } from "@/lib/db";
import { captureGsc, GscError } from "@/lib/services/gsc";
import { getLatestGscInputForSite } from "@/lib/authority/gsc-input";
import { refreshGscSnapshotIfLinked } from "./refresh-gsc";

describe("refreshGscSnapshotIfLinked", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ne fait rien si aucun snapshot GSC existant", async () => {
    vi.mocked(db.gscSnapshot.findFirst).mockResolvedValue(null);

    const result = await refreshGscSnapshotIfLinked("user-1", "site-1");

    expect(result).toEqual({ input: null, refreshed: false });
    expect(captureGsc).not.toHaveBeenCalled();
  });

  it("re-fetch et retourne les nouvelles métriques", async () => {
    vi.mocked(db.gscSnapshot.findFirst).mockResolvedValue({ id: "snap-old" });
    vi.mocked(captureGsc).mockResolvedValue({
      snapshotId: "snap-new",
      siteId: "site-1",
      matchedProperty: "sc-domain:exemple.com",
      aggregate: {} as never,
    });
    vi.mocked(getLatestGscInputForSite).mockResolvedValue({
      clicks: 179,
      impressions: 7200,
      ctr: 0.025,
      position: 10,
      queryCount: 42,
    });

    const result = await refreshGscSnapshotIfLinked("user-1", "site-1");

    expect(captureGsc).toHaveBeenCalledWith("user-1", "site-1");
    expect(result.refreshed).toBe(true);
    expect(result.input?.clicks).toBe(179);
  });

  it("conserve l'ancien snapshot si l'API GSC échoue", async () => {
    vi.mocked(db.gscSnapshot.findFirst).mockResolvedValue({ id: "snap-old" });
    vi.mocked(captureGsc).mockRejectedValue(new GscError("Token expiré"));
    vi.mocked(getLatestGscInputForSite).mockResolvedValue({
      clicks: 23,
      impressions: 1937,
      ctr: 0.012,
      position: 17.6,
      queryCount: 10,
    });

    const result = await refreshGscSnapshotIfLinked("user-1", "site-1");

    expect(result.refreshed).toBe(false);
    expect(result.warning).toBe("Token expiré");
    expect(result.input?.clicks).toBe(23);
  });
});
