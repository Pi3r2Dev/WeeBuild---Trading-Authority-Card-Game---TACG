import { describe, it, expect } from "vitest";
import {
  dedupeGscEntriesByDomain,
  domainFromGscProperty,
  gscPropertyToCaptureUrl,
} from "./property-url";

describe("domainFromGscProperty", () => {
  it("sc-domain → apex normalisé", () => {
    expect(domainFromGscProperty("sc-domain:WWW.Exemple.COM")).toBe("exemple.com");
  });

  it("préfixe URL → hostname sans www", () => {
    expect(domainFromGscProperty("https://www.exemple.fr/blog/")).toBe("exemple.fr");
  });
});

describe("gscPropertyToCaptureUrl", () => {
  it("sc-domain → https apex", () => {
    expect(gscPropertyToCaptureUrl("sc-domain:exemple.com")).toBe("https://exemple.com/");
  });

  it("préfixe URL → slash final", () => {
    expect(gscPropertyToCaptureUrl("https://www.exemple.com")).toBe("https://www.exemple.com/");
  });
});

describe("dedupeGscEntriesByDomain", () => {
  it("garde une propriété par domaine (owner sc-domain gagne)", () => {
    const deduped = dedupeGscEntriesByDomain([
      { siteUrl: "https://www.exemple.com/", permissionLevel: "siteOwner" },
      { siteUrl: "sc-domain:exemple.com", permissionLevel: "siteOwner" },
      { siteUrl: "sc-domain:autre.com", permissionLevel: "siteOwner" },
    ]);
    expect(deduped).toHaveLength(2);
    const exemple = deduped.find((e) => e.siteUrl.includes("exemple"));
    expect(exemple?.siteUrl).toBe("sc-domain:exemple.com");
  });
});
