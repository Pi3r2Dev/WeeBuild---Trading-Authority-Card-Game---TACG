import { describe, expect, it } from "vitest";
import {
  authorityTrustBadgeLabel,
  authorityTrustHint,
  fromPrismaAuthorityTrust,
  resolveAuthorityTrust,
  shouldShowAuthorityTrustBadge,
  toPrismaAuthorityTrust,
} from "./trust";

describe("resolveAuthorityTrust", () => {
  it("sans GSC → estimated", () => {
    expect(resolveAuthorityTrust({ withGsc: false })).toBe("estimated");
    expect(resolveAuthorityTrust({ withGsc: false }, "OAUTH")).toBe("estimated");
  });

  it("GSC OAuth → verified", () => {
    expect(resolveAuthorityTrust({ withGsc: true }, "OAUTH")).toBe("verified");
    expect(resolveAuthorityTrust({ withGsc: true }, null)).toBe("verified");
  });

  it("GSC screenshot → declared", () => {
    expect(resolveAuthorityTrust({ withGsc: true }, "SCREENSHOT")).toBe("declared");
  });
});

describe("Prisma mapping", () => {
  it("round-trip domaine ↔ enum", () => {
    expect(toPrismaAuthorityTrust("verified")).toBe("VERIFIED");
    expect(fromPrismaAuthorityTrust("VERIFIED")).toBe("verified");
    expect(fromPrismaAuthorityTrust("unknown")).toBe("estimated");
  });
});

describe("affichage", () => {
  it("badge et hint FR", () => {
    expect(authorityTrustBadgeLabel("estimated")).toBe("ESTIMÉ");
    expect(authorityTrustHint("estimated")).toContain("Search Console");
    expect(shouldShowAuthorityTrustBadge("estimated")).toBe(true);
    expect(shouldShowAuthorityTrustBadge("verified")).toBe(false);
  });
});
