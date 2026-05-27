"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { getFontEmbedCSS, toCanvas } from "html-to-image";
import * as THREE from "three";
import { CardFront } from "../card/CardFront";
import type { CardData, Level } from "../card/types";
import { createFoilMaterial } from "./foilShader";

/**
 * Approche A (banc d'essai « cartes du château ») — DOM → texture :
 * on rend la <CardFront> CSS hors-écran, on la capture **une fois** en
 * CanvasTexture (html-to-image), puis on la pose sur un plan 3D. Le foil
 * holographique devient un **shader fresnel natif** (blend additif) → enfin
 * physiquement réactif à l'angle, et gratuit côté GPU une fois bakée.
 *
 * Avantage visé pour le château : vraie matière 3D (éclairable, ombrable,
 * culbute avec la physique, compatible instancing). Coût : fidélité de
 * rasterisation (polices via getFontEmbedCSS, blend modes aplatis au bake).
 */

const CARD_W = 320;
const CARD_H = 540;
const PLANE_H = 2.6;
const PLANE_W = (PLANE_H * CARD_W) / CARD_H;
// Résolution de la capture DOM→texture. 3 = bon compromis netteté/mémoire (~6 Mo/carte).
// Pour le château (14 cartes) on baissera ou on mutualisera ; ici on cherche la netteté max.
const BAKE_PIXEL_RATIO = 3;

function CardMesh({ texture, level }: { texture: THREE.Texture; level: Level }) {
  const group = useRef<THREE.Group>(null);
  const foil = useMemo(() => {
    const m = createFoilMaterial();
    m.blending = THREE.AdditiveBlending; // équivalent 3D du blend CSS `screen` de la Voie A
    return m;
  }, []);
  useEffect(() => () => foil.dispose(), [foil]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.6) * 0.5; // oscillation douce → on voit le fresnel monter
      group.current.rotation.x = Math.sin(t * 0.4) * 0.08;
    }
    foil.uniforms.uTime.value = t;
  });

  return (
    <group ref={group}>
      <mesh>
        <planeGeometry args={[PLANE_W, PLANE_H]} />
        {/* basic + toneMapped:false = couleurs fidèles à la carte CSS (pas d'éclairage qui ternit) */}
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {level === 4 && (
        <mesh material={foil} position={[0, 0, 0.002]}>
          <planeGeometry args={[PLANE_W, PLANE_H]} />
        </mesh>
      )}
    </group>
  );
}

export default function CardBakeTexture({
  data,
  level = 4,
  width = CARD_W,
  height = CARD_H,
}: {
  data: CardData;
  level?: Level;
  width?: number;
  height?: number;
}) {
  const srcRef = useRef<HTMLDivElement>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = srcRef.current;
    if (!el) return;
    let cancelled = false;
    let tex: THREE.CanvasTexture | null = null;

    (async () => {
      try {
        await document.fonts.ready; // polices prêtes avant capture (sinon fallback)
        const fontEmbedCSS = await getFontEmbedCSS(el); // embarque @font-face une fois
        // pixelRatio élevé = texte (6–9px) net une fois rasterisé. 320×540×3 ≈ 960×1620.
        const canvas = await toCanvas(el, { pixelRatio: BAKE_PIXEL_RATIO, fontEmbedCSS, cacheBust: true });
        if (cancelled) return;
        tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 16; // clampé au max GPU — net aux angles rasants quand la carte tourne
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        setTexture(tex);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "bake failed");
      }
    })();

    return () => {
      cancelled = true;
      tex?.dispose();
    };
  }, [data, level]);

  return (
    <div style={{ position: "relative", width, height }}>
      {/* Source hors-écran : l'offset est sur le conteneur EXTERNE — le nœud capturé (srcRef)
          garde des styles propres (sinon html-to-image inline `left:-99999px` → capture vide). */}
      <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}>
        <div ref={srcRef} className={`lvl-${level}`} style={{ width: CARD_W, height: CARD_H }}>
          <CardFront data={data} level={level} />
        </div>
      </div>

      <Canvas camera={{ position: [0, 0, 3.4], fov: 42 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        {texture && <CardMesh texture={texture} level={level} />}
      </Canvas>

      {!texture && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--hub-fg-soft)", fontSize: 12 }}>
          {error ? `bake KO : ${error}` : "Capture DOM → texture…"}
        </div>
      )}
    </div>
  );
}
