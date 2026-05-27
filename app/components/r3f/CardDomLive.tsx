"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CardFront } from "../card/CardFront";
import type { CardData, Level } from "../card/types";

/**
 * Approche B (banc d'essai « cartes du château ») — DOM vivant :
 * la <CardFront> CSS est attachée à un objet 3D via `<Html transform>` de drei
 * (matrix3d → elle suit la matrice du corps, donc culbuterait avec la physique).
 *
 * Avantage : pixel-parfait, effets CSS live (conic foil, scanlines), zéro
 * rasterisation. Coût : DOM plat non éclairé par la scène WebGL, occlusion
 * seulement approximative (`occlude`/`occlude="blending"`), flou possible en
 * mode transform, et N sous-arbres DOM mis à jour chaque frame (perf château).
 */

const CARD_W = 320;
const CARD_H = 540;
const HTML_SCALE = 0.14; // mesuré : scale 0.45 → 1537px de haut ; ~0.14 → ~480px, cadrage comparable à A

function RotatingCard({ data, level }: { data: CardData; level: Level }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.6) * 0.5;
      group.current.rotation.x = Math.sin(t * 0.4) * 0.08;
    }
  });

  return (
    <group ref={group}>
      <Html transform scale={HTML_SCALE} className="no-select" pointerEvents="none">
        <div className={`lvl-${level}`} style={{ width: CARD_W, height: CARD_H }}>
          <CardFront data={data} level={level} />
        </div>
      </Html>
    </group>
  );
}

export default function CardDomLive({
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
  return (
    <div style={{ position: "relative", width, height }}>
      <Canvas camera={{ position: [0, 0, 3.4], fov: 42 }} dpr={[1, 2]} gl={{ alpha: true }}>
        <RotatingCard data={data} level={level} />
      </Canvas>
    </div>
  );
}
