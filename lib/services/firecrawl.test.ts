import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lookup } from "node:dns/promises";
import { scrape, healthcheck, FirecrawlError } from "./firecrawl";
import { SsrfError } from "./ssrf";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
const mockLookup = vi.mocked(lookup);
const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, statusText: "", json: async () => body } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  mockLookup.mockReset();
  mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never); // public par défaut
  delete process.env.FIRECRAWL_API_KEY;
});
afterEach(() => vi.unstubAllGlobals());

const ok = { success: true, data: { markdown: "# Titre\nContenu", html: "<a href='/a'>x</a>", metadata: { title: "T", sourceURL: "https://example.com" } } };

describe("scrape", () => {
  it("renvoie markdown/html/metadata sur succès", async () => {
    fetchMock.mockResolvedValue(jsonResponse(ok));
    const res = await scrape("https://example.com");
    expect(res.markdown).toContain("Contenu");
    expect(res.html).toContain("<a");
    expect(res.metadata.title).toBe("T");
  });

  it("parse screenshot quand withScreenshot est actif", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          markdown: "# T",
          html: "<p>x</p>",
          metadata: { title: "T" },
          screenshot: "https://cdn.firecrawl.test/viewport.webp",
        },
      }),
    );
    const res = await scrape("https://example.com", { withScreenshot: true });
    expect(res.screenshot).toBe("https://cdn.firecrawl.test/viewport.webp");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.formats.some((f: unknown) => typeof f === "object" && f !== null && (f as { type: string }).type === "screenshot")).toBe(
      true,
    );
  });

  it("n'envoie PAS d'Authorization sans clé, mais l'envoie si FIRECRAWL_API_KEY est posé", async () => {
    fetchMock.mockResolvedValue(jsonResponse(ok));
    await scrape("https://example.com");
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization).toBeUndefined();

    process.env.FIRECRAWL_API_KEY = "secret";
    await scrape("https://example.com");
    expect((fetchMock.mock.calls[1][1].headers as Record<string, string>).Authorization).toBe("Bearer secret");
  });

  it("jette sur success:false (sans retry)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, error: "boom" }));
    await expect(scrape("https://example.com")).rejects.toThrow(/boom/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("jette sur HTTP 4xx (sans retry)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));
    await expect(scrape("https://example.com")).rejects.toBeInstanceOf(FirecrawlError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("jette sur markdown vide", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { markdown: "   ", html: "", metadata: {} } }));
    await expect(scrape("https://example.com")).rejects.toThrow(/vide/);
  });

  it("jette sur timeout (abort) après retry", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          );
        }),
    );
    const p = scrape("https://example.com", { timeoutMs: 1000 });
    const assertion = expect(p).rejects.toThrow(/expiré/);
    await vi.advanceTimersByTimeAsync(1000); // 1re tentative → abort
    await vi.advanceTimersByTimeAsync(1500); // backoff
    await vi.advanceTimersByTimeAsync(1000); // 2e tentative → abort
    await assertion;
    vi.useRealTimers();
  });

  it("bloque une cible SSRF avant tout appel réseau", async () => {
    mockLookup.mockResolvedValue([{ address: "10.10.0.1", family: 4 }] as never);
    await expect(scrape("https://intranet.example")).rejects.toBeInstanceOf(SsrfError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("healthcheck", () => {
  it("true si GET / répond 200", async () => {
    fetchMock.mockResolvedValue(jsonResponse("ok"));
    expect(await healthcheck()).toBe(true);
  });
  it("false si le service est injoignable", async () => {
    fetchMock.mockImplementation(() => {
      throw new Error("ECONNREFUSED");
    });
    expect(await healthcheck()).toBe(false);
  });
});
