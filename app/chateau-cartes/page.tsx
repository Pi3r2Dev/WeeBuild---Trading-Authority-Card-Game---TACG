"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { getDemoCards } from "@/lib/data";
import { DevNav } from "../components/DevNav";

const loader = (
  <div style={{ width: 320, height: 540, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--hub-fg-soft)", fontSize: 12, border: "1px dashed var(--hub-line)", borderRadius: 12 }}>
    Chargement WebGL…
  </div>
);

const CardBakeTexture = dynamic(() => import("../components/r3f/CardBakeTexture"), { ssr: false, loading: () => loader });
const CardDomLive = dynamic(() => import("../components/r3f/CardDomLive"), { ssr: false, loading: () => loader });

const N4 = getDemoCards()[3]; // lemonde.fr — niveau 4 Holo

export default function ChateauCartesPage() {
  return (
    <main style={{ minHeight: "100dvh", padding: "56px 16px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <DevNav />
      <header style={{ marginBottom: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>A/B — Carte 3D pour le château</h1>
        <p style={{ color: "var(--hub-fg-soft)", margin: "6px 0 0", fontSize: 14 }}>
          Porter le style « Voie A » sur des objets 3D (DOM→texture). Les deux tournent doucement pour juger l&apos;angle.
        </p>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 48, justifyContent: "center", alignItems: "flex-start", marginBottom: 44 }}>
        <Col label="A — Texture bakée + foil natif" sub="html-to-image → CanvasTexture · foil fresnel 3D (additif)">
          <CardBakeTexture data={N4} level={4} />
        </Col>
        <Col label="B — DOM vivant (drei Html)" sub="CardFront live, attachée en matrix3d">
          <CardDomLive data={N4} level={4} />
        </Col>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", border: "1px solid var(--hub-line)", borderRadius: 12, padding: "16px 20px", fontSize: 13, color: "var(--hub-fg-soft)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--hub-fg)" }}>À juger :</strong> netteté du texte (A = rasterisé · B = pixel-parfait), fidélité des dégradés/blend
        (le conic-foil et les scanlines), comportement du foil à l&apos;angle (A = fresnel 3D réel · B = conic CSS figé),
        flou éventuel de B en mode transform. Le gagnant sera câblé sur les cartes physiques du château.
      </div>
    </main>
  );
}

function Col({ label, sub, children }: { label: string; sub: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 10, color: "var(--hub-fg)", letterSpacing: 1.5 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--hub-fg-soft)", marginTop: 4, maxWidth: 320 }}>{sub}</div>
      </div>
      {children}
    </div>
  );
}
