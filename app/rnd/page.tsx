"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Card } from "../components/card/Card";
import { getDemoCards } from "@/lib/data";
import { DevNav } from "../components/DevNav";

const loader = (
  <div style={{ width: 340, height: 560, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--hub-fg-soft)", fontSize: 12, border: "1px dashed var(--hub-line)", borderRadius: 12 }}>
    Chargement WebGL…
  </div>
);

const HoloCardR3F = dynamic(() => import("../components/r3f/HoloCardR3F"), {
  ssr: false,
  loading: () => loader,
});

const HoloCard3D = dynamic(() => import("../components/r3f/HoloCard3D"), {
  ssr: false,
  loading: () => loader,
});

const N4 = getDemoCards()[3]; // lemonde.fr — niveau 4 Holo

const ROWS: { critere: string; css: string; r3f: string; verdict: string }[] = [
  { critere: "Iridescence", css: "conic-gradient pilotée au pointeur (pseudo)", r3f: "Fresnel sur la normale 3D réelle — le foil suit l'angle de vue", verdict: "R3F + réaliste" },
  { critere: "Perf mobile", css: "composé par le GPU compositeur, ~0 coût", r3f: "rendu WebGL chaque frame (voir HUD FPS)", verdict: "CSS + léger" },
  { critere: "Bundle", css: "≈ 0 (tokens.css)", r3f: "+ three + fiber + drei (~150 ko gz)", verdict: "CSS gagne" },
  { critere: "Effort dev", css: "tokens + 1 hook (~1 j)", r3f: "shader GLSL + CanvasTexture + Canvas (~plus)", verdict: "CSS + simple" },
];

export default function RndPage() {
  return (
    <main style={{ minHeight: "100dvh", padding: "56px 16px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <DevNav />
      <header style={{ marginBottom: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>A/B — Foil holographique N4</h1>
        <p style={{ color: "var(--hub-fg-soft)", margin: "6px 0 0", fontSize: 14 }}>
          La carte CSS validée vs une reconstruction R3F · bouge le curseur sur chaque carte
        </p>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 48, justifyContent: "center", alignItems: "flex-start", marginBottom: 44 }}>
        <Col label="CSS" sub="conic-gradient + mix-blend + tilt CSS (validé)">
          <Card data={N4} state="dispo" />
        </Col>
        <Col label="R3F / Three.js" sub="shader Fresnel + tilt 3D réel · HUD FPS + panneau Leva">
          <HoloCardR3F data={N4} />
        </Col>
        <Col label="Voie A ⭐" sub="contenu DOM CSS (pixel-parfait) + plan de foil WebGL fresnel, collés">
          <HoloCard3D data={N4} />
        </Col>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", border: "1px solid var(--hub-line)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--hub-bg-1)", textAlign: "left" }}>
              <Th>Critère</Th>
              <Th>CSS</Th>
              <Th>R3F</Th>
              <Th>Verdict</Th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.critere} style={{ borderTop: "1px solid var(--hub-line)" }}>
                <Td bold>{r.critere}</Td>
                <Td muted>{r.css}</Td>
                <Td muted>{r.r3f}</Td>
                <Td>
                  <span style={{ color: r.verdict.startsWith("R3F") ? "var(--hub-accent)" : "var(--hub-accent-2)", fontWeight: 600 }}>{r.verdict}</span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
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

function Th({ children }: { children: ReactNode }) {
  return <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--hub-fg)" }}>{children}</th>;
}

function Td({ children, bold, muted }: { children: ReactNode; bold?: boolean; muted?: boolean }) {
  return <td style={{ padding: "10px 14px", color: muted ? "var(--hub-fg-soft)" : "var(--hub-fg)", fontWeight: bold ? 600 : 400, verticalAlign: "top" }}>{children}</td>;
}
