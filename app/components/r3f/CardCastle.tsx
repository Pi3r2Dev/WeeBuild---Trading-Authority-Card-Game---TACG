"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import { ContactShadows } from "@react-three/drei";
import { Perf } from "r3f-perf";

// Carte (ratio proche 320×540)
const TW = 1.05;
const TH = 1.7;
const TT = 0.06;

const LEVEL_COLORS = ["#9bbc0f", "#3b5bff", "#7dd3fc", "#d946ef"];

// Tente en triangle : angle marqué pour un vrai /\
const THETA = 0.4;
const DX = (TH / 2) * Math.sin(THETA);
const CYt = (TH / 2) * Math.cos(THETA);
const H = TH * Math.cos(THETA); // hauteur de l'apex (base au sol)
const GAP = 0.04; // léger jeu à l'apex : évite un chevauchement profond au passage en dynamique

type Spec = { pos: [number, number, number]; rot: [number, number, number]; dims: [number, number, number]; color: string };

/** Château de cartes traditionnel : tentes + ponts horizontaux + 2 étages. */
function buildCastle(): Spec[] {
  const specs: Spec[] = [];
  let ci = 0;
  function color(): string {
    return LEVEL_COLORS[ci++ % LEVEL_COLORS.length];
  }
  // Tente Λ (pointe en HAUT) : carte gauche penche vers la droite (-θ), carte droite vers la gauche (+θ)
  // → les sommets se rejoignent, les pieds s'écartent. Tranche (TT) vers la caméra = profil.
  function tent(cx: number, baseY: number) {
    specs.push({ pos: [cx - DX - GAP, baseY + CYt, 0], rot: [0, 0, -THETA], dims: [TT, TH, TW], color: color() });
    specs.push({ pos: [cx + DX + GAP, baseY + CYt, 0], rot: [0, 0, THETA], dims: [TT, TH, TW], color: color() });
  }
  function bridge(cx: number, atY: number) {
    specs.push({ pos: [cx, atY + TT / 2, 0], rot: [0, 0, 0], dims: [TH, TT, TW], color: color() });
  }
  // Pyramide « A » qui rétrécit vers un sommet unique (château traditionnel) : 3 → 2 → 1 tentes
  [-1.6, 0, 1.6].forEach((cx) => tent(cx, 0)); // étage 1 — 3 tentes
  [-0.8, 0.8].forEach((bx) => bridge(bx, H)); // plancher 1
  [-0.8, 0.8].forEach((cx) => tent(cx, H + TT)); // étage 2 — 2 tentes
  bridge(0, 2 * H + TT); // plancher 2
  tent(0, 2 * H + 2 * TT); // étage 3 — sommet (1 tente)
  return specs;
}

const CASTLE = buildCastle();

function PhysCard({ spec, live, onWake }: { spec: Spec; live: boolean; onWake: () => void }) {
  const ref = useRef<RapierRigidBody>(null);
  function push(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    const d = e.ray.direction;
    if (!live) onWake();
    // Une fois passé en dynamique (frame suivante), on pousse la carte tapée
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        ref.current?.applyImpulse({ x: d.x * 2.4, y: 0.4, z: d.z * 2.4 }, true);
        ref.current?.applyTorqueImpulse({ x: (Math.random() - 0.5) * 0.3, y: (Math.random() - 0.5) * 0.3, z: (Math.random() - 0.5) * 0.3 }, true);
      })
    );
  }
  return (
    <RigidBody ref={ref} type={live ? "dynamic" : "fixed"} position={spec.pos} rotation={spec.rot} friction={1.1} restitution={0} colliders={false}>
      <CuboidCollider args={[spec.dims[0] / 2, spec.dims[1] / 2, spec.dims[2] / 2]} />
      <mesh onPointerDown={push}>
        <boxGeometry args={spec.dims} />
        <meshStandardMaterial color={spec.color} metalness={0.15} roughness={0.5} />
      </mesh>
    </RigidBody>
  );
}

function Ground() {
  return (
    <RigidBody type="fixed" friction={1.2}>
      <CuboidCollider args={[20, 0.5, 20]} position={[0, -0.5, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#262a35" />
      </mesh>
    </RigidBody>
  );
}

function Rig() {
  const cam = useThree((s) => s.camera);
  useEffect(() => {
    cam.lookAt(0, 1.9, 0);
  }, [cam]);
  return null;
}

/** Château de cartes physique — figé au départ, s'effondre au premier tap. */
export default function CardCastle({ width = 680, height = 540 }: { width?: number; height?: number }) {
  const [resetKey, setResetKey] = useState(0);
  const [live, setLive] = useState(false);

  function reset() {
    setLive(false);
    setResetKey((k) => k + 1);
  }

  return (
    <div style={{ width: "100%", maxWidth: width, height, position: "relative", margin: "0 auto" }}>
      <Canvas dpr={[1, 2]} camera={{ position: [5, 3.4, 9.5], fov: 44 }}>
        <color attach="background" args={["#0b0c10"]} />
        <Rig />
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 10, 6]} intensity={2.6} />
        <pointLight position={[-5, 4, 4]} intensity={30} color="#8A2BE2" />
        <pointLight position={[5, 3, 3]} intensity={20} color="#39FF14" />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={14} blur={2.2} far={5} color="#000000" />
        <Physics key={resetKey} gravity={[0, -9.81, 0]}>
          <Ground />
          {CASTLE.map((spec, i) => (
            <PhysCard key={i} spec={spec} live={live} onWake={() => setLive(true)} />
          ))}
        </Physics>
        <Perf position="top-left" minimal />
      </Canvas>

      <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12, alignItems: "center", pointerEvents: "none" }}>
        <span style={{ fontSize: 12, color: "var(--hub-fg-soft)" }}>{live ? "💥 Château effondré" : "👆 Tape une carte pour faire tomber le château"}</span>
        <button
          onClick={reset}
          style={{ pointerEvents: "auto", padding: "6px 14px", background: "rgba(138,43,226,0.2)", border: "1px solid rgba(138,43,226,0.55)", color: "#fff", fontFamily: "var(--font-hub)", fontWeight: 600, fontSize: 12, borderRadius: 999, cursor: "pointer" }}
        >
          ↻ Reconstruire
        </button>
      </div>
    </div>
  );
}
