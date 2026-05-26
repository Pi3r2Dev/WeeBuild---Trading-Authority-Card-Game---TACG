"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { useControls } from "leva";
import * as THREE from "three";
import type { CardData } from "../card/types";

/** Valeurs par défaut du shader holo, partagées entre les uniforms initiaux et les contrôles leva (évite la dérive). */
const HOLO_DEFAULTS = { foil: 1.1, fresnel: 2.6, bands: 3 };

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
  uniform sampler2D uContent;
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
    vec4 content = texture2D(uContent, vUv);
    if (content.a < 0.5) discard;

    // Angle de vue RÉEL (la normale tourne avec le tilt 3D)
    float vd = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
    float fres = pow(1.0 - vd, uFresnel);

    // Balayage iridescent animé (suit l'angle de vue + pointeur + temps)
    float sweep = (vUv.x * 0.6 - vUv.y * 0.4) * uBands
                + (1.0 - vd) * 2.0
                + uPointer.x * 1.2 - uPointer.y * 0.8
                + uTime * 0.05;
    vec3 foil = pow(hue2rgb(fract(sweep)), vec3(0.8));
    float stripe = 0.5 + 0.5 * sin(sweep * 6.2831853);

    // Iridescence sur TOUTE la carte (comme le conic-gradient CSS) + boost aux bords / au tilt
    float sheen = mix(0.40, 0.82, stripe);
    float rim = smoothstep(0.05, 0.95, fres);
    float strength = clamp(uFoil * (sheen + rim * 0.5), 0.0, 1.0);

    // Mélange type "screen" : le foil remplit les zones sombres, le contenu clair reste lisible
    vec3 col = content.rgb + (1.0 - content.rgb) * foil * strength;

    // Glints fins (scintillent surtout au tilt)
    float n = fract(sin(dot(floor(vUv * 260.0), vec2(12.9898, 78.233)) + uTime * 1.5) * 43758.5453);
    col += vec3(step(0.994, n)) * (0.2 + rim * 0.5);

    gl_FragColor = vec4(col, content.a);
  }
`;

/** Dessine le contenu de la carte N4 sur un canvas → texture de base. */
function useContentTexture(data: CardData) {
  return useMemo(() => {
    const W = 384;
    const H = 648;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d")!;

    // Masque arrondi (coins transparents)
    const r = 22;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, r);
    ctx.clip();

    // Fond
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, W, H);

    // Cadre
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, W - 12, H - 12);

    // Top bar
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(10, 10, W - 20, 64);
    // Gemme dofollow (losange rubis)
    ctx.fillStyle = "#ff5577";
    ctx.beginPath();
    ctx.moveTo(40, 22);
    ctx.lineTo(56, 36);
    ctx.lineTo(48, 62);
    ctx.lineTo(32, 62);
    ctx.lineTo(24, 36);
    ctx.closePath();
    ctx.fill();
    // Domaine
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(data.domain, 72, 38);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "11px monospace";
    ctx.fillText("HOLO · " + data.linkType.toUpperCase(), 72, 58);
    // LV.4 + dots
    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.fillText("LV.4", W - 92, 36);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(W - 52 + i * 11, 28, 8, 8);
    }

    // Site-shot (mock holographique)
    const ix = 26;
    const iy = 92;
    const iw = W - 52;
    const ih = iw;
    const g = ctx.createLinearGradient(ix, iy, ix + iw, iy + ih);
    g.addColorStop(0, "#1e1b4b");
    g.addColorStop(1, "#0a0a14");
    ctx.fillStyle = g;
    ctx.fillRect(ix, iy, iw, ih);
    const hero = ctx.createLinearGradient(ix, iy, ix + iw, iy);
    hero.addColorStop(0, "#ff007f");
    hero.addColorStop(0.5, "#7f00ff");
    hero.addColorStop(1, "#00ffff");
    ctx.fillStyle = hero;
    ctx.fillRect(ix + 16, iy + 24, iw - 32, 80);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(ix + 28, iy + 40, 150, 10);
    ctx.fillRect(ix + 28, iy + 58, 110, 6);
    const cardsY = iy + 130;
    ["#7f00ff", "#00ffff", "#ff007f"].forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.strokeRect(ix + 16 + i * ((iw - 32) / 3), cardsY, (iw - 32) / 3 - 10, 90);
    });
    // Glitch HTML
    ctx.fillStyle = "#fbbf24";
    ctx.font = "13px monospace";
    ctx.fillText('<a rel="dofollow">', ix + 20, iy + ih - 28);

    // Stats HP / ATK
    const sy = iy + ih + 30;
    function drawStat(label: string, value: number, yy: number, color: string) {
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "11px monospace";
      ctx.fillText(label, 26, yy);
      ctx.fillStyle = color;
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(String(value), W - 48, yy);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(26, yy + 8, W - 74, 10);
      ctx.fillStyle = color;
      ctx.fillRect(26, yy + 8, (W - 74) * Math.min(1, value / 100), 10);
    }
    drawStat("HP", data.hp, sy, "#ff3df0");
    drawStat("ATK", data.atk, sy + 38, "#00ffff");

    // Résumé
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(20, sy + 70, W - 40, 96);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "9px monospace";
    ctx.fillText("// RÉSUMÉ", 30, sy + 90);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "15px sans-serif";
    wrapText(ctx, data.summary, 30, sy + 112, W - 60, 20);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [data]);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w + " ";
      yy += lh;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

function CardMesh({ data }: { data: CardData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tex = useContentTexture(data);
  const pointer = useThree((s) => s.pointer);

  const { foil, fresnel, bands } = useControls("Holo R3F", {
    foil: { value: HOLO_DEFAULTS.foil, min: 0, max: 1.8, step: 0.05 },
    fresnel: { value: HOLO_DEFAULTS.fresnel, min: 0.5, max: 6, step: 0.1 },
    bands: { value: HOLO_DEFAULTS.bands, min: 1, max: 8, step: 0.5 },
  });

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uContent: { value: tex },
          uTime: { value: 0 },
          uPointer: { value: new THREE.Vector2(0, 0) },
          uFoil: { value: HOLO_DEFAULTS.foil },
          uFresnel: { value: HOLO_DEFAULTS.fresnel },
          uBands: { value: HOLO_DEFAULTS.bands },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
      }),
    [tex]
  );

  // Libère la texture du canvas quand elle est remplacée (changement de `data`) ou au démontage.
  useEffect(() => () => tex.dispose(), [tex]);

  // Libère le ShaderMaterial quand il est recréé (changement de `tex`) ou au démontage.
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    material.uniforms.uFoil.value = foil;
    material.uniforms.uFresnel.value = fresnel;
    material.uniforms.uBands.value = bands;
  }, [material, foil, fresnel, bands]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uPointer.value.set(pointer.x, pointer.y);
    const m = meshRef.current;
    if (m) {
      m.rotation.y = THREE.MathUtils.lerp(m.rotation.y, pointer.x * 0.5, 0.1);
      m.rotation.x = THREE.MathUtils.lerp(m.rotation.x, -pointer.y * 0.4, 0.1);
    }
  });

  return (
    <mesh ref={meshRef} material={material}>
      <planeGeometry args={[3.2, 5.4, 1, 1]} />
    </mesh>
  );
}

/** Carte N4 holographique rendue en React Three Fiber (shader Fresnel). */
export default function HoloCardR3F({ data, width = 340, height = 560 }: { data: CardData; width?: number; height?: number }) {
  return (
    <div style={{ width, height }}>
      <Canvas camera={{ position: [0, 0, 7.5], fov: 35 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <Perf position="top-left" minimal />
        <CardMesh data={data} />
      </Canvas>
    </div>
  );
}
