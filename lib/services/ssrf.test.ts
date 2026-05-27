import { describe, it, expect, vi, beforeEach } from "vitest";
import { lookup } from "node:dns/promises";
import { assertScrapableUrl, SsrfError } from "./ssrf";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
const mockLookup = vi.mocked(lookup);

/** Fait résoudre le DNS vers les adresses données. */
function resolvesTo(...addresses: string[]) {
  mockLookup.mockResolvedValue(addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })) as never);
}

describe("assertScrapableUrl", () => {
  beforeEach(() => mockLookup.mockReset());

  it("accepte une URL publique", async () => {
    resolvesTo("93.184.216.34");
    const url = await assertScrapableUrl("https://example.com/page");
    expect(url.hostname).toBe("example.com");
  });

  it.each([
    ["privée 10/8", "10.10.0.1"],
    ["privée 192.168/16", "192.168.1.5"],
    ["privée 172.16/12", "172.16.0.9"],
    ["loopback 127/8", "127.0.0.1"],
    ["link-local 169.254/16 (métadonnées cloud)", "169.254.169.254"],
    ["IPv6 loopback", "::1"],
    ["IPv6 ULA", "fd00::1"],
  ])("bloque une cible %s", async (_label, ip) => {
    resolvesTo(ip);
    await expect(assertScrapableUrl("https://intranet.example")).rejects.toBeInstanceOf(SsrfError);
  });

  it("bloque si UNE des adresses résolues est privée", async () => {
    resolvesTo("93.184.216.34", "10.0.0.5");
    await expect(assertScrapableUrl("https://rebind.example")).rejects.toBeInstanceOf(SsrfError);
  });

  it("rejette un schéma non http(s) sans toucher au DNS", async () => {
    await expect(assertScrapableUrl("ftp://example.com")).rejects.toBeInstanceOf(SsrfError);
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it("rejette une URL invalide", async () => {
    await expect(assertScrapableUrl("pas une url")).rejects.toBeInstanceOf(SsrfError);
  });

  it("rejette si le DNS ne renvoie aucune adresse", async () => {
    resolvesTo(); // tableau vide
    await expect(assertScrapableUrl("https://inexistant.example")).rejects.toBeInstanceOf(SsrfError);
  });
});
