"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import * as THREE from "three";
import { CardFront } from "../card/CardFront";
import type { CardData } from "../card/types";

/**
 * Voie A (cf. docs/draft-cartes-couches-effets.md §4) :
 * le CONTENU reste la vraie <CardFront> CSS validée (zéro divergence),
 * et un PLAN DE FOIL WebGL transparent (fresnel sur la normale 3D réelle)
 * est posé au-dessus en blend `screen`. Les deux sont inclinés par les
 * MÊMES angles lissés → ils restent collés.
 *
 * Calage perspective : la <CardFront> est tournée par CSS sous
 * `perspective: 1400px` ; la caméra Three est placée à z = 1400 avec
 * `fov` calculé pour que la déformation soit identique (FOV ci-dessous).
 */

const CARD_W = 320;
const CARD_H = 540;
const PERSP = 1400; // = perspective CSS du conteneur (Card.tsx)
const RADIUS = 10; // = --frame-radius N4 (tokens.css)
const MAX_TILT = 14; // deg, = usePointerTilt max
/** fov vertical tel que la projection Three == la perspective CSS (1400px) sur une carte de 540px. */
const FOV = (2 * Math.atan(CARD_H / 2 / PERSP) * 180) / Math.PI;

const FOIL_DEFAULTS = { foil: 0.9, fresnel: 2.4, bands: 3 };

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uFoil;
  uniform float uFresnel;
  uniform float uBands;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;

  vec3 hue2rgb(float h) {
    vec3 c = abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0;
    return clamp(c, 0.0, 1.0);
  }

  void main() {
    // Angle de vue RÉEL : la normale tourne avec le tilt 3D du plan.
    float vd = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
    float fres = pow(1.0 - vd, uFresnel);

    float sweep = (vUv.x * 0.6 - vUv.y * 0.4) * uBands
                + (1.0 - vd) * 2.0
                + uPointer.x * 1.2 - uPointer.y * 0.8
                + uTime * 0.05;
    vec3 foil = pow(hue2rgb(fract(sweep)), vec3(0.8));
    float stripe = 0.5 + 0.5 * sin(sweep * 6.2831853);

    // Base faible (face-on discret → le conic CSS sous-jacent domine au repos),
    // l'iridescence monte avec l'angle de vue (rim) = ce que le CSS ne sait qu'approximer.
    float sheen = mix(0.02, 0.18, stripe);
    float rim = smoothstep(0.0, 1.0, fres);
    float strength = clamp(uFoil * (sheen + rim * 0.85), 0.0, 1.0);

    vec3 col = foil * strength;

    // Glints fins (scintillent surtout au tilt)
    float n = fract(sin(dot(floor(vUv * 260.0), vec2(12.9898, 78.233)) + uTime * 1.5) * 43758.5453);
    col += vec3(step(0.993, n)) * (0.12 + rim * 0.5);

    // Sortie destinée a un blend CSS screen : le noir n'ajoute rien, le foil eclaircit.
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface Tilt {
  tRx: number;
  tRy: number;
  tActive: number;
  px: number;
  py: number;
}

function FoilMesh({ tilt, wrap }: { tilt: React.MutableRefObject<Tilt>; wrap: React.RefObject<HTMLDivElement | null> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const cur = useRef({ rx: 0, ry: 0, active: 0 });

  const ctrl = useControls("Foil A (voie A)", {
    foil: { value: FOIL_DEFAULTS.foil, min: 0, max: 1.8, step: 0.05 },
    fresnel: { value: FOIL_DEFAULTS.fresnel, min: 0.5, max: 6, step: 0.1 },
    bands: { value: FOIL_DEFAULTS.bands, min: 1, max: 8, step: 0.5 },
  });

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPointer: { value: new THREE.Vector2() },
          uFoil: { value: FOIL_DEFAULTS.foil },
          uFresnel: { value: FOIL_DEFAULTS.fresnel },
          uBands: { value: FOIL_DEFAULTS.bands },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    material.uniforms.uFoil.value = ctrl.foil;
    material.uniforms.uFresnel.value = ctrl.fresnel;
    material.uniforms.uBands.value = ctrl.bands;
  }, [material, ctrl.foil, ctrl.fresnel, ctrl.bands]);

  useFrame((state) => {
    const t = tilt.current;
    const c = cur.current;
    // Lissage unique (façon transition CSS), source partagée DOM + foil → collés.
    c.rx += (t.tRx - c.rx) * 0.18;
    c.ry += (t.tRy - c.ry) * 0.18;
    c.active += (t.tActive - c.active) * 0.18;

    const m = mesh.current;
    if (m) {
      // Calage des signes : CSS (y vers le bas) ↔ three (y vers le haut) → on inverse rx.
      m.rotation.x = THREE.MathUtils.degToRad(-c.rx);
      m.rotation.y = THREE.MathUtils.degToRad(c.ry);
      m.scale.setScalar(1 + 0.04 * c.active); // même lift que le DOM
    }

    // Pilote la <CardFront> DOM + le glare avec les MÊMES valeurs lissées.
    const w = wrap.current;
    if (w) {
      w.style.setProperty("--rx", `${c.rx.toFixed(3)}deg`);
      w.style.setProperty("--ry", `${c.ry.toFixed(3)}deg`);
      w.style.setProperty("--active", c.active.toFixed(3));
      w.style.setProperty("--px", `${(t.px * 50 + 50).toFixed(2)}%`);
      w.style.setProperty("--py", `${(t.py * 50 + 50).toFixed(2)}%`);
    }

    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uPointer.value.set(t.px, t.py);
  });

  return (
    <mesh ref={mesh} material={material}>
      <planeGeometry args={[CARD_W, CARD_H, 1, 1]} />
    </mesh>
  );
}

/** Carte N4 — voie A : contenu DOM CSS pixel-parfait + plan de foil WebGL fresnel collé. */
export default function HoloCard3D({ data, width = CARD_W, height = CARD_H }: { data: CardData; width?: number; height?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const tilt = useRef<Tilt>({ tRx: 0, tRy: 0, tActive: 0, px: 0, py: 0 });

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      tilt.current.tRx = -(py - 0.5) * 2 * MAX_TILT;
      tilt.current.tRy = (px - 0.5) * 2 * MAX_TILT;
      tilt.current.tActive = 1;
      tilt.current.px = px * 2 - 1;
      tilt.current.py = py * 2 - 1;
    };
    const reset = () => {
      tilt.current.tRx = 0;
      tilt.current.tRy = 0;
      tilt.current.tActive = 0;
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    el.addEventListener("pointercancel", reset);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
      el.removeEventListener("pointercancel", reset);
    };
  }, []);

  return (
    <div
      ref={wrap}
      className="lvl-4 no-select"
      style={{ width, height, perspective: PERSP, position: "relative", isolation: "isolate", cursor: "crosshair" }}
      title="Voie A — contenu DOM + foil WebGL · bouge le curseur"
    >
      {/* Contenu DOM = la carte CSS validée, inclinée (pas de transition : lissé par le rAF R3F) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(calc(1 + 0.04 * var(--active, 0)))",
        }}
      >
        <CardFront data={data} level={4} />
        {/* Glare spéculaire (z6) — identique à la carte CSS */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: RADIUS,
            background:
              "radial-gradient(circle at var(--px, 50%) var(--py, 50%), rgba(255,255,255,0.5), rgba(255,255,255,0) 42%)",
            mixBlendMode: "overlay",
            opacity: "var(--active, 0)",
            pointerEvents: "none",
            zIndex: 6,
          }}
        />
      </div>

      {/* Plan de foil WebGL — posé au-dessus, blend screen (préserve texte/barres, remplit les zones sombres) */}
      <Canvas
        style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", borderRadius: RADIUS }}
        camera={{ position: [0, 0, PERSP], fov: FOV, near: 100, far: 3000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <FoilMesh tilt={tilt} wrap={wrap} />
      </Canvas>
    </div>
  );
}
