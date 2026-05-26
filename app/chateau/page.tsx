"use client";

import dynamic from "next/dynamic";
import { DevNav } from "../components/DevNav";

const CardCastle = dynamic(() => import("../components/r3f/CardCastle"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 520, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--hub-fg-soft)", fontSize: 12 }}>
      Chargement de la physique…
    </div>
  ),
});

export default function ChateauPage() {
  return (
    <main style={{ minHeight: "100dvh", padding: "56px 16px 64px", maxWidth: 760, margin: "0 auto" }}>
      <DevNav />
      <header style={{ marginBottom: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Château de cartes</h1>
        <p style={{ color: "var(--hub-fg-soft)", margin: "6px 0 0", fontSize: 14 }}>
          Physique temps réel (Rapier) · <span style={{ color: "var(--hub-accent-2)" }}>impossible en CSS</span>
        </p>
      </header>

      <CardCastle />

      <p style={{ maxWidth: 540, margin: "28px auto 0", textAlign: "center", fontSize: 13, color: "var(--hub-fg-soft)", lineHeight: 1.6 }}>
        Piste « accueil » : un château bâti avec <strong>les cartes du membre</strong> (ses sites), qu&apos;on renverse
        au doigt — un hero ludique qui montre sa main en 3D. À cadrer (perf mobile, quand le rebâtir, lien vers le Hub).
      </p>
    </main>
  );
}
