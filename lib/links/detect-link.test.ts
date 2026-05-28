import { describe, it, expect } from "vitest";
import { detectLink } from "./detect-link";

const target = "https://partenaire.com/";

describe("detectLink", () => {
  it("détecte un lien absolu vers le domaine cible + ancre + position", () => {
    const html = `<p>intro</p><a href="https://autre.fr">autre</a> <a href="https://partenaire.com/guide">notre comparatif SEO</a>`;
    const d = detectLink(html, target);
    expect(d.linkDetected).toBe(true);
    expect(d.anchorText).toBe("notre comparatif SEO");
    expect(d.positionInPage).toBe(2);
    expect(d.mentionDetected).toBe(true);
  });

  it("matche malgré www / casse / chemin différent", () => {
    const html = `<a href="https://WWW.Partenaire.com/blog/x">lien</a>`;
    expect(detectLink(html, target).linkDetected).toBe(true);
  });

  it("extrait le rel (nofollow) mais détecte quand même", () => {
    const html = `<a href="https://partenaire.com" rel="nofollow sponsored">x</a>`;
    const d = detectLink(html, target);
    expect(d.linkDetected).toBe(true);
    expect(d.rel).toBe("nofollow sponsored");
  });

  it("rel null si absent", () => {
    const html = `<a href="https://partenaire.com">x</a>`;
    expect(detectLink(html, target).rel).toBeNull();
  });

  it("pas de lien mais mention de marque → mentionDetected, linkDetected false", () => {
    const html = `<p>On recommande Partenaire pour le SEO, sans lien.</p>`;
    const d = detectLink(html, target, { brandTokens: ["partenaire"] });
    expect(d.linkDetected).toBe(false);
    expect(d.mentionDetected).toBe(true);
  });

  it("ni lien ni mention → tout false", () => {
    const html = `<p>Un article sans rapport.</p>`;
    const d = detectLink(html, target);
    expect(d.linkDetected).toBe(false);
    expect(d.mentionDetected).toBe(false);
  });

  it("ignore les href relatifs (ne peuvent pas être cross-domaine)", () => {
    const html = `<a href="/partenaire">interne</a>`;
    expect(detectLink(html, target).linkDetected).toBe(false);
  });

  it("HTML vide ou URL cible invalide → tout false", () => {
    expect(detectLink("", target).linkDetected).toBe(false);
    expect(detectLink("<a href='https://partenaire.com'>x</a>", "pas-une-url").linkDetected).toBe(false);
  });
});
