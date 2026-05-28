"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { CardData } from "@/lib/domain";
import { Body, ScreenHeader, StatusBar } from "./primitives";
import { BottomNav } from "./BottomNav";

const CardCastle = dynamic(() => import("@/app/components/r3f/CardCastle"), {
  ssr: false,
  loading: () => (
    <div className="chateau-loading">Chargement du château (WebGL + physique)…</div>
  ),
});

/**
 * Château de cartes 3D — écran produit (`/chateau`).
 * Hero ludique : pyramide physique (Rapier) bâtie avec la main du joueur.
 * Le stage WebGL remplit l'espace sous le header (cf. `.chateau-stage` dans globals.css).
 * Tap = pousser une carte ; glisser = l'attraper (cf. CardCastle).
 */
export function ChateauScreen({ mySites, usingDemoDeck }: { mySites: CardData[]; usingDemoDeck: boolean }) {
  return (
    <div className="chateau-screen">
      <StatusBar />
      <Body pad={16} bottom={72}>
        <ScreenHeader
          title="Château de cartes"
          subtitle={
            usingDemoDeck
              ? "Démo — capturez un site pour bâtir le château avec vos cartes."
              : `${mySites.length} carte${mySites.length > 1 ? "s" : ""} dans votre main`
          }
        />

        {usingDemoDeck && (
          <p className="chateau-demo-banner">
            Votre main est vide : le château utilise les cartes de démo (4 niveaux).{" "}
            <Link href="/capturer" style={{ color: "var(--hub-accent-2)", fontWeight: 600 }}>
              Capturer un site →
            </Link>
          </p>
        )}

        <div className="chateau-stage">
          <CardCastle cards={mySites} fill />
          <p className="chateau-stage__hint">
            Physique temps réel — impossible en CSS seul. Retirez une carte porteuse pour faire s&apos;effondrer le
            reste.
          </p>
        </div>
      </Body>
      <BottomNav />
    </div>
  );
}
