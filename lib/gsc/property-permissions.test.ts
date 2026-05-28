import { describe, it, expect, afterEach } from "vitest";
import {
  delegatedImportEnabledFromEnv,
  gscPermissionLabel,
  gscPropertyRank,
  isEligibleGscProperty,
  isOwnershipProofLevel,
} from "./property-permissions";

describe("isEligibleGscProperty", () => {
  const owner = { siteUrl: "sc-domain:exemple.com", permissionLevel: "siteOwner" as const };
  const full = { siteUrl: "sc-domain:client.com", permissionLevel: "siteFullUser" as const };
  const restricted = { siteUrl: "https://blog.com/", permissionLevel: "siteRestrictedUser" as const };
  const unverified = { siteUrl: "https://x.com/", permissionLevel: "siteUnverifiedUser" as const };

  it("accepte siteOwner par défaut", () => {
    expect(isEligibleGscProperty(owner)).toBe(true);
  });

  it("refuse siteFullUser sans allowDelegated", () => {
    expect(isEligibleGscProperty(full, { allowDelegated: false })).toBe(false);
  });

  it("accepte siteFullUser si allowDelegated", () => {
    expect(isEligibleGscProperty(full, { allowDelegated: true })).toBe(true);
  });

  it("refuse toujours restricted et unverified", () => {
    expect(isEligibleGscProperty(restricted, { allowDelegated: true })).toBe(false);
    expect(isEligibleGscProperty(unverified)).toBe(false);
  });
});

describe("gscPropertyRank", () => {
  it("priorise owner + sc-domain", () => {
    const ownerDomain = gscPropertyRank({ siteUrl: "sc-domain:a.com", permissionLevel: "siteOwner" });
    const ownerPrefix = gscPropertyRank({ siteUrl: "https://a.com/", permissionLevel: "siteOwner" });
    const fullDomain = gscPropertyRank({ siteUrl: "sc-domain:a.com", permissionLevel: "siteFullUser" });
    expect(ownerDomain).toBeGreaterThan(ownerPrefix);
    expect(ownerDomain).toBeGreaterThan(fullDomain);
  });
});

describe("isOwnershipProofLevel", () => {
  it("true uniquement pour siteOwner", () => {
    expect(isOwnershipProofLevel("siteOwner")).toBe(true);
    expect(isOwnershipProofLevel("siteFullUser")).toBe(false);
  });
});

describe("gscPermissionLabel", () => {
  it("libellés FR", () => {
    expect(gscPermissionLabel("siteOwner")).toBe("Propriétaire");
    expect(gscPermissionLabel("siteRestrictedUser")).toBe("Gestion limitée");
  });
});

describe("delegatedImportEnabledFromEnv", () => {
  const prev = process.env.WEBUILD_GSC_ALLOW_DELEGATED;

  afterEach(() => {
    if (prev === undefined) delete process.env.WEBUILD_GSC_ALLOW_DELEGATED;
    else process.env.WEBUILD_GSC_ALLOW_DELEGATED = prev;
  });

  it("false par défaut", () => {
    delete process.env.WEBUILD_GSC_ALLOW_DELEGATED;
    expect(delegatedImportEnabledFromEnv()).toBe(false);
  });

  it("true si env = true", () => {
    process.env.WEBUILD_GSC_ALLOW_DELEGATED = "true";
    expect(delegatedImportEnabledFromEnv()).toBe(true);
  });
});
