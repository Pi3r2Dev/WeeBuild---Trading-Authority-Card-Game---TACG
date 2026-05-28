/**
 * Portrait carte alimenté par les assets crawlés (logo / hero / screenshot).
 * Phase 2 MVP — filtres CSS par niveau ; fallback initiales si pas de hero.
 */
/* eslint-disable @next/next/no-img-element -- URLs crawlées dynamiques ; next/image non adapté en R&D */

import type { Level } from "./types";
import type { SiteVisualAssets } from "@/lib/capture/visual-asset-types";
import styles from "./SitePortrait.module.css";

export interface SitePortraitProps {
  level: Level;
  assets: SiteVisualAssets;
  /** Domaine affiché en fallback typographique (initiales). */
  domain: string;
}

/** Initiales du domaine (2 caractères max) pour le fallback sans image. */
function domainInitials(domain: string): string {
  const base = domain.replace(/^www\./, "").split(".")[0] ?? domain;
  return base.slice(0, 2).toUpperCase();
}

/**
 * Portrait personnalisé — hero + logo + screenshot optionnel, filtré par niveau.
 */
export function SitePortrait({ level, assets, domain }: SitePortraitProps) {
  const lvlClass = styles[`lvl${level}` as keyof typeof styles] ?? "";
  const hero = assets.heroImageUrl ?? assets.homepageScreenshotUrl;
  const showScreen =
    assets.homepageScreenshotUrl && assets.heroImageUrl && assets.homepageScreenshotUrl !== assets.heroImageUrl;

  return (
    <div className={`${styles.portrait} ${lvlClass}`} data-level={level}>
      {hero ? (
        <img className={styles.hero} src={hero} alt="" draggable={false} />
      ) : (
        <div className={styles.initials} aria-hidden>
          {domainInitials(domain)}
        </div>
      )}

      {showScreen && (
        <img className={styles.screen} src={assets.homepageScreenshotUrl!} alt="" draggable={false} />
      )}

      {assets.logoUrl ? (
        <img className={styles.logo} src={assets.logoUrl} alt="" draggable={false} />
      ) : null}

      {level === 1 && <div className={styles.scanlines} aria-hidden />}
      {level === 4 && <div className={styles.holoOverlay} aria-hidden />}
    </div>
  );
}
