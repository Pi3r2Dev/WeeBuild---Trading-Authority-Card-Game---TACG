import { describe, it, expect } from "vitest";
import {
  evaluateRescanPolicy,
  formatRescanCooldownLabel,
  rescanBadgeLabel,
  RESCAN_COOLDOWN_MS,
} from "./rescan-policy";

describe("evaluateRescanPolicy", () => {
  const now = new Date("2026-05-28T12:00:00.000Z");

  it("autorise le premier rescan (lastRescanAt null)", () => {
    expect(evaluateRescanPolicy(null, false, now)).toEqual({
      allowed: true,
      nextAvailableAt: null,
    });
  });

  it("refuse avant la fin de la fenêtre d'une semaine", () => {
    const last = new Date(now.getTime() - RESCAN_COOLDOWN_MS + 60_000);
    const result = evaluateRescanPolicy(last, false, now);
    expect(result.allowed).toBe(false);
    expect(result.nextAvailableAt?.getTime()).toBe(last.getTime() + RESCAN_COOLDOWN_MS);
  });

  it("autorise après une semaine complète", () => {
    const last = new Date(now.getTime() - RESCAN_COOLDOWN_MS);
    expect(evaluateRescanPolicy(last, false, now)).toEqual({
      allowed: true,
      nextAvailableAt: null,
    });
  });

  it("bypass admin même dans la fenêtre", () => {
    const last = new Date(now.getTime() - 60_000);
    expect(evaluateRescanPolicy(last, true, now)).toEqual({
      allowed: true,
      nextAvailableAt: null,
    });
  });
});

describe("formatRescanCooldownLabel", () => {
  const now = new Date("2026-05-28T12:00:00.000Z");

  it("retourne null si la fenêtre est écoulée", () => {
    expect(formatRescanCooldownLabel(now, now)).toBeNull();
  });

  it("affiche les jours restants", () => {
    const next = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    expect(formatRescanCooldownLabel(next, now)).toBe("Rescan dans 3 j");
  });

  it("affiche demain pour ~1 jour", () => {
    const next = new Date(now.getTime() + 20 * 60 * 60 * 1000);
    expect(formatRescanCooldownLabel(next, now)).toBe("Rescan demain");
  });
});

describe("rescanBadgeLabel", () => {
  const now = new Date("2026-05-28T12:00:00.000Z");

  it("masque le badge pour un admin", () => {
    expect(rescanBadgeLabel(new Date(now.getTime() - 60_000), true, now)).toBeNull();
  });

  it("masque le badge quand le rescan est disponible", () => {
    expect(rescanBadgeLabel(null, false, now)).toBeNull();
  });

  it("affiche le décompte en cooldown", () => {
    const last = new Date(now.getTime() - RESCAN_COOLDOWN_MS + 2 * 24 * 60 * 60 * 1000);
    expect(rescanBadgeLabel(last, false, now)).toBe("Rescan dans 2 j");
  });
});
