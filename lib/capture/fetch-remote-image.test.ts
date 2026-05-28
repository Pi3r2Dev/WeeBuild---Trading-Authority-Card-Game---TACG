import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lookup } from "node:dns/promises";
import { fetchRemoteImage, sniffImageMime } from "./fetch-remote-image";
import { SsrfError } from "@/lib/services/ssrf";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
const mockLookup = vi.mocked(lookup);
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  mockLookup.mockReset();
  mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
  delete process.env.FIRECRAWL_API_URL;
});

afterEach(() => vi.unstubAllGlobals());

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("sniffImageMime", () => {
  it("détecte PNG", () => {
    expect(sniffImageMime(PNG_1x1)).toBe("image/png");
  });
});

describe("fetchRemoteImage", () => {
  it("télécharge et valide le MIME", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      url: "https://cdn.example/logo.png",
      headers: { get: () => "image/png" },
      body: {
        getReader: () => {
          let sent = false;
          return {
            read: async () => {
              if (sent) return { done: true, value: undefined };
              sent = true;
              return { done: false, value: PNG_1x1 };
            },
          };
        },
      },
    });

    const out = await fetchRemoteImage("https://cdn.example/logo.png");
    expect(out.mime).toBe("image/png");
    expect(out.bytes.equals(PNG_1x1)).toBe(true);
  });

  it("autorise l'origine Firecrawl sans DNS public", async () => {
    process.env.FIRECRAWL_API_URL = "http://10.10.0.1:3002";
    fetchMock.mockResolvedValue({
      ok: true,
      url: "http://10.10.0.1:3002/storage/shot.png",
      headers: { get: () => "image/png" },
      body: {
        getReader: () => {
          let sent = false;
          return {
            read: async () => {
              if (sent) return { done: true, value: undefined };
              sent = true;
              return { done: false, value: PNG_1x1 };
            },
          };
        },
      },
    });

    const out = await fetchRemoteImage("http://10.10.0.1:3002/storage/shot.png");
    expect(out.mime).toBe("image/png");
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it("bloque IP privée hors origine Firecrawl", async () => {
    mockLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }] as never);
    await expect(fetchRemoteImage("https://evil.internal/logo.png")).rejects.toBeInstanceOf(SsrfError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
