import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/gsc", () => ({
  captureGsc: vi.fn(),
  GscError: class GscError extends Error {},
}));

vi.mock("@/lib/authority/gsc-input", () => ({
  getLatestGscInputForSite: vi.fn(),
}));

import { captureGsc, GscError } from "@/lib/services/gsc";
import { getLatestGscInputForSite } from "@/lib/authority/gsc-input";
import { tryCaptureGscForSite } from "./refresh-gsc";

describe("tryCaptureGscForSite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tente toujours captureGsc même sans snapshot existant", async () => {
    vi.mocked(captureGsc).mockResolvedValue({
      snapshotId: "snap-new",
      siteId: "site-1",
      matchedProperty: "sc-domain:exemple.com",
      aggregate: {} as never,
    });
    vi.mocked(getLatestGscInputForSite).mockResolvedValue({
      clicks: 10,
      impressions: 100,
      ctr: 0.1,
      position: 5,
      queryCount: 3,
    });

    const result = await tryCaptureGscForSite("user-1", "site-1");

    expect(captureGsc).toHaveBeenCalledWith("user-1", "site-1", undefined);
    expect(result.refreshed).toBe(true);
    expect(result.input?.clicks).toBe(10);
  });

  it("renvoie un warning si GSC échoue (première liaison)", async () => {
    vi.mocked(captureGsc).mockRejectedValue(new GscError("Propriété non vérifiée"));
    vi.mocked(getLatestGscInputForSite).mockResolvedValue(null);

    const result = await tryCaptureGscForSite("user-1", "site-1");

    expect(result.refreshed).toBe(false);
    expect(result.warning).toBe("Propriété non vérifiée");
    expect(result.input).toBeNull();
  });
});
