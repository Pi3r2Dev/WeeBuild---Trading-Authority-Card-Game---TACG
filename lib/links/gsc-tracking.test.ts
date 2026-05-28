import { afterEach, describe, expect, it } from "vitest";
import {
  linkTrackIntervalDaysFromEnv,
  linkTrackItemsPerTickFromEnv,
  linkTrackingDueCutoff,
  propertyFromSnapshotRaw,
  targetsForLink,
  type TrackableLink,
} from "./gsc-tracking";

const link: TrackableLink = {
  id: "link-1",
  publishedUrl: "https://donneur.com/article",
  targetUrl: "https://benef.com/page-cible",
  donorUserId: "u-donor",
  donorSiteId: "s-donor",
  beneficiaryUserId: "u-benef",
  beneficiarySiteId: "s-benef",
};

afterEach(() => {
  delete process.env.WEBUILD_LINK_TRACK_INTERVAL_DAYS;
  delete process.env.WEBUILD_LINK_TRACK_ITEMS_PER_TICK;
});

describe("linkTrackingDueCutoff", () => {
  it("recule de N jours", () => {
    const cutoff = linkTrackingDueCutoff(new Date("2026-05-28T00:00:00Z"), 7);
    expect(cutoff.toISOString()).toBe("2026-05-21T00:00:00.000Z");
  });
});

describe("linkTrackIntervalDaysFromEnv", () => {
  it("défaut 7", () => {
    expect(linkTrackIntervalDaysFromEnv()).toBe(7);
  });
  it("lit l'env, ignore les valeurs invalides", () => {
    process.env.WEBUILD_LINK_TRACK_INTERVAL_DAYS = "3";
    expect(linkTrackIntervalDaysFromEnv()).toBe(3);
    process.env.WEBUILD_LINK_TRACK_INTERVAL_DAYS = "0";
    expect(linkTrackIntervalDaysFromEnv()).toBe(7);
    process.env.WEBUILD_LINK_TRACK_INTERVAL_DAYS = "abc";
    expect(linkTrackIntervalDaysFromEnv()).toBe(7);
  });
});

describe("linkTrackItemsPerTickFromEnv", () => {
  it("défaut 5, plafonné à 50", () => {
    expect(linkTrackItemsPerTickFromEnv()).toBe(5);
    process.env.WEBUILD_LINK_TRACK_ITEMS_PER_TICK = "999";
    expect(linkTrackItemsPerTickFromEnv()).toBe(50);
    process.env.WEBUILD_LINK_TRACK_ITEMS_PER_TICK = "12";
    expect(linkTrackItemsPerTickFromEnv()).toBe(12);
  });
});

describe("propertyFromSnapshotRaw", () => {
  it("extrait property string non vide", () => {
    expect(propertyFromSnapshotRaw({ property: "sc-domain:exemple.com" })).toBe(
      "sc-domain:exemple.com",
    );
  });
  it("null si absente, vide, non-string ou rawJson invalide", () => {
    expect(propertyFromSnapshotRaw({ property: "" })).toBeNull();
    expect(propertyFromSnapshotRaw({ property: 42 })).toBeNull();
    expect(propertyFromSnapshotRaw({})).toBeNull();
    expect(propertyFromSnapshotRaw(null)).toBeNull();
    expect(propertyFromSnapshotRaw("texte")).toBeNull();
  });
});

describe("targetsForLink", () => {
  it("produit les côtés donneur (publishedUrl) et bénéficiaire (targetUrl)", () => {
    const targets = targetsForLink(link);
    expect(targets).toEqual([
      { side: "DONOR", userId: "u-donor", siteId: "s-donor", pageUrl: "https://donneur.com/article" },
      { side: "BENEFICIARY", userId: "u-benef", siteId: "s-benef", pageUrl: "https://benef.com/page-cible" },
    ]);
  });

  it("omet le côté donneur si publishedUrl est nul", () => {
    const targets = targetsForLink({ ...link, publishedUrl: null });
    expect(targets).toHaveLength(1);
    expect(targets[0].side).toBe("BENEFICIARY");
  });
});
