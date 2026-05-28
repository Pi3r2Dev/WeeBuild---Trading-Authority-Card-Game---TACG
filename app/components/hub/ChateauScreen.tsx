"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CardData } from "@/lib/domain";
import { Body, ScreenHeader, StatusBar } from "./primitives";
import { BottomNav } from "./BottomNav";

const CardCastle = dynamic(() => import("@/app/components/r3f/CardCastle"), {
  ssr: false,
  loading: () => (
    <div
      className="chateau-loading"
      style={{
        width: "100%",
        maxWidth: 920,
        height: 480,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--hub-fg-soft)",
        fontSize: 13,
        border: "1px dashed var(--hub-line)",
        borderRadius: 12,
        margin: "0 auto",
      }}
    >
      Chargement du château (WebGL + physique)…
    </div>
  ),
});

/** Dimensions du viewport 3D selon la largeur d'écran (desktop élargi). */
function useCastleViewport() {
  const [size, setSize] = useState({ w: 680, h: 480 });

  useEffect(() => {
    const update = () => {
      const desktop = window.matchMedia("(min-width: 901px)").matches;
      if (desktop) {
        const w = Math.min(960, Math.floor(window.innerWidth - 232 - 56));
        const h = Math.min(620, Math.floor(window.innerHeight - 200));
        setSize({ w: Math.max(520, w), h: Math.max(440, h) });
      } else {
        const w = Math.min(360, Math.floor(window.innerWidth - 32));
        setSize({ w, h: 420 });
      }
    };
    update();
    window.addEventListener("resize", update);
    const mq = window.matchMedia("(min-width: 901px)");
    mq.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      mq.removeEventListener("change", update);
    };
  }, []);

  return size;
}

/**
 * Château de cartes 3D — écran produit (`/chateau`).
 * Hero ludique : pyramide physique (Rapier) bâtie avec la main du joueur.
 * Tap = pousser une carte ; glisser = l'attraper (cf. CardCastle).
 */
export function ChateauScreen({ mySites, usingDemoDeck }: { mySites: CardData[]; usingDemoDeck: boolean }) {
  const { w, h } = useCastleViewport();

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
          <p
            style={{
              margin: "0 0 12px",
              padding: "10px 14px",
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--hub-fg-soft)",
              background: "rgba(138,43,226,0.08)",
              border: "1px solid rgba(138,43,226,0.35)",
              borderRadius: 8,
            }}
          >
            Votre main est vide : le château utilise les cartes de démo (4 niveaux).{" "}
            <Link href="/capturer" style={{ color: "var(--hub-accent-2)", fontWeight: 600 }}>
              Capturer un site →
            </Link>
          </p>
        )}

        <div className="chateau-stage">
          <CardCastle cards={mySites} width={w} height={h} />
        </div>

        <p
          style={{
            margin: "12px 0 0",
            textAlign: "center",
            fontSize: 12,
            color: "var(--hub-fg-dim)",
            lineHeight: 1.55,
            maxWidth: 560,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Physique temps réel — impossible en CSS seul. Retirez une carte porteuse pour faire s&apos;effondrer le reste.
        </p>
      </Body>
      <BottomNav />
    </div>
  );
}
