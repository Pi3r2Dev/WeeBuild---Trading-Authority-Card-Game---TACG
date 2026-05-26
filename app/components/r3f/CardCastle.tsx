"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import { Perf } from "r3f-perf";

// Dimensions d'une carte (ratio proche 320×540, épaissie pour la stabilité physique)
const CW = 1.05;
const CH = 1.7;
const CT = 0.08;

// Couleurs par niveau (Game Boy → Holo)
const LEVEL_COLORS = ["#9bbc0f", "#3b5bff", "#7dd3fc", "#d946ef"];

const THETA = 0.22; // inclinaison des cartes d'une tente
const DX = (CH / 2) * Math.sin(THETA);
const CY = (CH / 2) * Math.cos(THETA);
const GAP = 0.06; // petit jeu : pas de chevauchement de collider au spawn (sinon éjection)

const TENTS_X = [-1.8, 0, 1.8];
const ROWS_Z = [0, -1.4];

function PhysCard({ position, rotation = [0, 0, 0], color }: { position: [number, number, number]; rotation?: [number, number, number]; color: string }) {
  const ref = useRef<RapierRigidBody>(null);
  const push = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const d = e.ray.direction;
    ref.current?.applyImpulse({ x: d.x * 4, y: 0.6, z: d.z * 4 }, true);
    ref.current?.applyTorqueImpulse({ x: (Math.random() - 0.5) * 0.4, y: (Math.random() - 0.5) * 0.4, z: (Math.random() - 0.5) * 0.4 }, true);
  };
  return (
    <RigidBody ref={ref} position={position} rotation={rotation} friction={1.2} restitution={0} canSleep colliders={false}>
      <CuboidCollider args={[CW / 2, CH / 2, CT / 2]} />
      <mesh onPointerDown={push} castShadow receiveShadow>
        <boxGeometry args={[CW, CH, CT]} />
        <meshStandardMaterial color={color} metalness={0.15} roughness={0.5} />
      </mesh>
    </RigidBody>
  );
}

function Tent({ cx, cz, i }: { cx: number; cz: number; i: number }) {
  return (
    <>
      <PhysCard position={[cx - DX - GAP, CY, cz]} rotation={[0, 0, THETA]} color={LEVEL_COLORS[i % 4]} />
      <PhysCard position={[cx + DX + GAP, CY, cz]} rotation={[0, 0, -THETA]} color={LEVEL_COLORS[(i + 1) % 4]} />
    </>
  );
}

function Castle() {
  let i = 0;
  return (
    <>
      {ROWS_Z.map((cz) =>
        TENTS_X.map((cx) => {
          const tent = <Tent key={`${cx}-${cz}`} cx={cx} cz={cz} i={i} />;
          i += 1;
          return tent;
        })
      )}
    </>
  );
}

function Ground() {
  return (
    <RigidBody type="fixed" friction={1.2}>
      <CuboidCollider args={[20, 0.5, 20]} position={[0, -0.5, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#262a35" />
      </mesh>
    </RigidBody>
  );
}

function Rig() {
  const cam = useThree((s) => s.camera);
  useEffect(() => {
    cam.lookAt(0, 0.7, 0);
  }, [cam]);
  return null;
}

/** Château de cartes physique — tape une carte pour le faire tomber (mobile/desktop). */
export default function CardCastle({ width = 680, height = 520 }: { width?: number; height?: number }) {
  const [resetKey, setResetKey] = useState(0);
  return (
    <div style={{ width: "100%", maxWidth: width, height, position: "relative", margin: "0 auto" }}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 2.2, 7], fov: 45 }}>
        <color attach="background" args={["#0b0c10"]} />
        <Rig />
        <ambientLight intensity={1.1} />
        <directionalLight position={[5, 9, 6]} intensity={2.6} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-5, 3, 4]} intensity={30} color="#8A2BE2" />
        <pointLight position={[5, 2, 3]} intensity={20} color="#39FF14" />
        <Physics key={resetKey} gravity={[0, -9.81, 0]}>
          <Ground />
          <Castle />
        </Physics>
        <Perf position="top-left" minimal />
      </Canvas>

      <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12, alignItems: "center", pointerEvents: "none" }}>
        <span style={{ fontSize: 12, color: "var(--hub-fg-soft)" }}>👆 Tape une carte pour faire tomber le château</span>
        <button
          onClick={() => setResetKey((k) => k + 1)}
          style={{ pointerEvents: "auto", padding: "6px 14px", background: "rgba(138,43,226,0.2)", border: "1px solid rgba(138,43,226,0.55)", color: "#fff", fontFamily: "var(--font-hub)", fontWeight: 600, fontSize: 12, borderRadius: 999, cursor: "pointer" }}
        >
          ↻ Reconstruire
        </button>
      </div>
    </div>
  );
}
