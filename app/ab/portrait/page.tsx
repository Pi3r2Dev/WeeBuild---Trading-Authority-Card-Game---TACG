"use client";

import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RND_ENABLED } from "@/app/components/app/flags";
import { DevNav } from "@/app/components/DevNav";
import { SiteShot } from "@/app/components/card/SiteShot";
import { SitePortrait } from "@/app/components/card/SitePortrait";
import { DEMO_CARDS } from "@/lib/data/fixtures";
import { DEMO_VISUAL_ASSETS } from "@/lib/capture/visual-demo-fixtures";
import type { Level } from "@/lib/levels";
import styles from "./portrait-ab.module.css";

const LEVELS: Level[] = [1, 2, 3, 4];

/**
 * A/B — portrait placeholder (SiteShot SVG) vs portrait crawlé (SitePortrait).
 * Route R&D : `NEXT_PUBLIC_ENABLE_RND=true`.
 */
export default function PortraitAbPage() {
  if (!RND_ENABLED) notFound();

  const demo = DEMO_CARDS[0];

  return (
    <main className={styles.page}>
      <DevNav />
      <header className={styles.header}>
        <h1 className={styles.title}>A/B — Portrait carte (assets crawlés)</h1>
        <p className={styles.sub}>
          Colonne A = placeholder SVG actuel (SiteShot) · Colonne B = composition logo + hero + screenshot
          filtrée par niveau (SitePortrait)
        </p>
        <p className={styles.meta}>
          Fixtures locales : <code>/fixtures/portrait/demo-*.svg</code> · provenance simulée{" "}
          {JSON.stringify(DEMO_VISUAL_ASSETS.provenance)}
        </p>
      </header>

      {LEVELS.map((level) => (
        <section key={level} className={styles.levelBlock}>
          <h2 className={styles.levelTitle}>Niveau {level}</h2>
          <div className={styles.compareRow}>
            <AbCol label="A — Placeholder" sub="SVG générique (prod actuelle)">
              <PortraitFrame level={level}>
                <SiteShot level={level} />
              </PortraitFrame>
            </AbCol>
            <AbCol label="B — Crawl + charte" sub="hero + logo + screenshot · filtres CSS MVP">
              <PortraitFrame level={level}>
                <SitePortrait level={level} assets={DEMO_VISUAL_ASSETS} domain={demo.domain} />
              </PortraitFrame>
            </AbCol>
          </div>
        </section>
      ))}
    </main>
  );
}

function AbCol({ label, sub, children }: { label: string; sub: string; children: ReactNode }) {
  return (
    <div className={styles.col}>
      <div className={styles.colHead}>
        <div className={styles.colLabel}>{label}</div>
        <div className={styles.colSub}>{sub}</div>
      </div>
      {children}
    </div>
  );
}

/** Cadre carré 1:1 identique au portrait du Gabarit D. */
function PortraitFrame({ level, children }: { level: Level; children: ReactNode }) {
  const isPS2 = level === 3;
  const isHolo = level === 4;
  return (
    <div
      className={`${styles.frame} lvl-${level}`}
      data-level={level}
      style={{
        border: isHolo
          ? "1px solid rgba(255,255,255,0.25)"
          : isPS2
            ? "1px solid rgba(148,163,184,0.55)"
            : undefined,
        borderRadius: isPS2 || isHolo ? 4 : 0,
      }}
    >
      {children}
    </div>
  );
}
