"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import { ContactShadows } from "@react-three/drei";
import { DevPerf } from "./DevPerf";
import { getFontEmbedCSS, toCanvas } from "html-to-image";
import * as THREE from "three";
import { LEVEL_COLORS } from "@/lib/levels";
// Fallback démo si la main est vide (page produit `/chateau` passe le deck réel en props).
import { DEMO_CARDS } from "@/lib/data/fixtures";
import { CardFront } from "../card/CardFront";
import { CardBack } from "../card/CardBack";
import type { CardData, Level } from "../card/types";
import { createFoilMaterial } from "./foilShader";

// Carte (ratio proche 320×540). Repère local : X = tranche/épaisseur, Y = hauteur, Z = largeur.
// → la grande face de la carte a pour normale l'axe local +X.
const TW = 1.05;
const TH = 1.7;
const TT = 0.06;

// Tente en triangle : angle marqué pour un vrai /\
const THETA = 0.4;
const DX = (TH / 2) * Math.sin(THETA);
const CYt = (TH / 2) * Math.cos(THETA);
const H = TH * Math.cos(THETA); // hauteur de l'apex (base au sol)
const GAP = 0.04; // léger jeu à l'apex : évite un chevauchement profond au passage en dynamique

// ─── Réglages d'interaction (le « feel » tient ici) ───────────────────────────
const DRAG_THRESHOLD = 8; // px de déplacement avant qu'un appui devienne un drag
const INSPECT_DIST = 3.2; // distance devant la caméra en pose d'inspection (carte ~pleine hauteur)
const FOCUS_INNER = 0.15; // |ndc| en deçà duquel le focus centre vaut 1 (de face, proche)
const FOCUS_OUTER = 0.6; // |ndc| au-delà duquel le focus vaut 0 (pose de base, suivi)
const FOLLOW_TILT = 0.35; // inclinaison max (rad) hors-centre, redressée vers le centre
const GROUND_MIN_Y = TH / 2; // centre mini de la carte saisie : garde le bas au niveau du sol (kinématique = ignore les collisions)
const RELEASE_SPIN = 0.25; // amplitude du couple aléatoire au lâcher (tombe en tournant un peu)
const PUSH_LIN = 2.4; // impulsion linéaire du tap (pousser)
const PUSH_UP = 0.4;
const PUSH_SPIN = 0.3;

// ─── Habillage des cartes (approche A : DOM→texture, cf. /chateau-cartes) ──────
const CARD_W = 320;
const CARD_H = 540;
// Résolution du bake. Les cartes du château sont petites/lointaines → 2 suffit (perf + mémoire ; ~2,3 Mo/carte).
const BAKE_PIXEL_RATIO = 2;
// Plancher émissif des faces texturées : garde l'art lisible même éclairé/dans l'ombre (le `map` capte l'ambiance).
const CARD_EMISSIVE = 0.5;
/**
 * Deck effectif du château : main du joueur ou fixtures démo.
 * On ne bake que les cartes uniques (max 4) pour limiter mémoire / temps html-to-image.
 */
function resolveCastleDeck(cards?: CardData[]): CardData[] {
  const src = cards?.length ? cards : DEMO_CARDS;
  const seen = new Set<string>();
  const uniq: CardData[] = [];
  for (const c of src) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    uniq.push(c);
    if (uniq.length >= 4) break;
  }
  return uniq.length > 0 ? uniq : DEMO_CARDS.slice(0, 4);
}

/** Textures bakées d'une carte : recto (CardFront) + verso (CardBack). */
type CardTex = { front: THREE.CanvasTexture; back: THREE.CanvasTexture };

/** Axe local de la normale de la GRANDE face (= recto) : le plus petit côté de la boîte. */
function faceAxis(dims: [number, number, number]): 0 | 1 | 2 {
  const [x, y, z] = dims;
  if (x <= y && x <= z) return 0;
  if (y <= x && y <= z) return 1;
  return 2;
}

// Scratch réutilisé chaque frame (zéro alloc dans la boucle ; un seul château par page).
const _fwd = new THREE.Vector3();
const _plane = new THREE.Plane();
const _follow = new THREE.Vector3();
const _inspect = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _qTilt = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();

type Spec = { pos: [number, number, number]; rot: [number, number, number]; dims: [number, number, number]; color: string };
type BodyType = "fixed" | "dynamic" | "kinematicPosition";
type Gesture = { id: number; pointerId: number; x0: number; y0: number; dragging: boolean };

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Oriente la face (axe local +X) de la carte vers la caméra, redressée (Y vertical, Z horizontal). */
function faceCamera(from: THREE.Vector3, camPos: THREE.Vector3, out: THREE.Quaternion) {
  _x.subVectors(camPos, from);
  if (_x.lengthSq() < 1e-8) _x.set(0, 0, 1);
  _x.normalize();
  _z.crossVectors(_x, _up);
  if (_z.lengthSq() < 1e-8) _z.set(0, 0, 1);
  else _z.normalize();
  _y.crossVectors(_z, _x).normalize();
  _m.makeBasis(_x, _y, _z);
  out.setFromRotationMatrix(_m);
}

/**
 * Pose cible d'une carte saisie, en fonction du pointeur (NDC) :
 * - suivi sur un plan face-caméra à la profondeur de saisie (`anchor`) ;
 * - plus on approche du centre de l'écran, plus la carte avance vers la caméra
 *   et se redresse de face (lecture pleine) ; hors-centre, elle revient à sa pose de base.
 * Écrit dans outPos / outQuat. Retourne false si le rayon est parallèle au plan.
 */
function grabbedPose(
  ndc: THREE.Vector2,
  camera: THREE.Camera,
  raycaster: THREE.Raycaster,
  anchor: THREE.Vector3,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion,
): boolean {
  camera.getWorldDirection(_fwd);
  _plane.setFromNormalAndCoplanarPoint(_fwd, anchor);
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(_plane, _follow)) return false;

  const f = smoothstep(FOCUS_OUTER, FOCUS_INNER, ndc.length()); // 1 au centre, 0 loin
  _inspect.copy(camera.position).addScaledVector(_fwd, INSPECT_DIST);
  outPos.lerpVectors(_follow, _inspect, f);
  outPos.y = Math.max(outPos.y, GROUND_MIN_Y); // jamais sous le sol

  faceCamera(outPos, camera.position, outQuat);
  // Inclinaison « tenue en main » hors-centre, qui s'annule au centre (de face).
  _euler.set(-ndc.y * FOLLOW_TILT * (1 - f), ndc.x * FOLLOW_TILT * (1 - f), 0);
  _qTilt.setFromEuler(_euler);
  outQuat.multiply(_qTilt);
  return true;
}

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

/**
 * Bake recto (CardFront) + verso (CardBack) de chaque carte du deck (DOM CSS → CanvasTexture),
 * hors-écran, une fois. L'offset hors-écran est sur le conteneur EXTERNE (sinon html-to-image
 * inline `left:-99999px` dans le nœud capturé → texture vide).
 */
function CardTextureBaker({ cards, onReady }: { cards: CardData[]; onReady: (textures: CardTex[]) => void }) {
  const frontRefs = useRef<(HTMLDivElement | null)[]>([]);
  const backRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    let cancelled = false;
    const made: CardTex[] = [];
    const flat: THREE.CanvasTexture[] = []; // pour tout disposer si on annule en cours
    (async () => {
      await document.fonts.ready; // polices prêtes avant capture (sinon fallback)
      let fontEmbedCSS = "";
      const bake = async (el: HTMLDivElement) => {
        if (!fontEmbedCSS) fontEmbedCSS = await getFontEmbedCSS(el); // calculé une fois, réutilisé
        const canvas = await toCanvas(el, { pixelRatio: BAKE_PIXEL_RATIO, fontEmbedCSS, cacheBust: true });
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 16;
        tex.needsUpdate = true;
        flat.push(tex);
        return tex;
      };
      for (let i = 0; i < cards.length; i++) {
        const f = frontRefs.current[i];
        const b = backRefs.current[i];
        if (!f || !b) continue;
        const front = await bake(f);
        const back = await bake(b);
        if (cancelled) {
          flat.forEach((t) => t.dispose());
          return;
        }
        made[i] = { front, back };
      }
      onReady(made);
    })();
    return () => {
      cancelled = true;
    };
  }, [cards, onReady]);

  return (
    <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none", display: "flex" }}>
      {cards.map((c, i) => (
        <div key={c.id} style={{ display: "flex" }}>
          <div ref={(el) => { frontRefs.current[i] = el; }} className={`lvl-${c.level}`} style={{ width: CARD_W, height: CARD_H }}>
            <CardFront data={c} level={c.level} />
          </div>
          <div ref={(el) => { backRefs.current[i] = el; }} className={`lvl-${c.level}`} style={{ width: CARD_W, height: CARD_H }}>
            <CardBack data={c} level={c.level} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PhysCard({
  index,
  spec,
  type,
  tex,
  level,
  register,
  onPointerDown,
  onHoverCursor,
}: {
  index: number;
  spec: Spec;
  type: BodyType;
  tex: CardTex | null;
  level: Level;
  register: (i: number, body: RapierRigidBody | null) => void;
  onPointerDown: (e: ThreeEvent<PointerEvent>, i: number) => void;
  onHoverCursor: (hover: boolean) => void;
}) {
  const ref = useRef<RapierRigidBody>(null);
  const axis = faceAxis(spec.dims); // normale du recto (grande face)

  // Foil fresnel natif (N4) : scintille à l'angle réel quand la carte tourne. uTime fixe → l'éclat vient du mouvement.
  const foil = useMemo(() => {
    if (level !== 4) return null;
    const m = createFoilMaterial();
    m.blending = THREE.AdditiveBlending; // équivalent 3D du blend CSS `screen`
    return m;
  }, [level]);
  useEffect(() => () => foil?.dispose(), [foil]);

  // Enregistre le corps auprès du contrôleur (le `type` ne recrée pas le corps → identité stable).
  useEffect(() => {
    register(index, ref.current);
    return () => register(index, null);
  }, [register, index]);

  // Plan de foil aligné sur la grande face +recto (orienté selon l'axe le plus fin).
  const eps = spec.dims[axis] / 2 + 0.003;
  const foilPos: [number, number, number] = axis === 0 ? [eps, 0, 0] : axis === 1 ? [0, eps, 0] : [0, 0, eps];
  const foilRot: [number, number, number] = axis === 0 ? [0, Math.PI / 2, 0] : axis === 1 ? [-Math.PI / 2, 0, 0] : [0, 0, 0];
  const foilW = axis === 0 ? spec.dims[2] : spec.dims[0];
  const foilH = axis === 0 ? spec.dims[1] : axis === 1 ? spec.dims[2] : spec.dims[1];

  return (
    <RigidBody ref={ref} type={type} position={spec.pos} rotation={spec.rot} friction={1.1} restitution={0} colliders={false}>
      <CuboidCollider args={[spec.dims[0] / 2, spec.dims[1] / 2, spec.dims[2] / 2]} />
      <mesh
        onPointerDown={(e) => onPointerDown(e, index)}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverCursor(true);
        }}
        onPointerOut={() => onHoverCursor(false)}
      >
        <boxGeometry args={spec.dims} />
        {tex ? (
          // 6 faces : recto (axis*2) + verso (axis*2+1) texturés en standard+emissive (captent la lumière, restent lisibles) ; le reste = corps sombre.
          [0, 1, 2, 3, 4, 5].map((k) =>
            k === axis * 2 ? (
              <meshStandardMaterial key={k} attach={`material-${k}`} map={tex.front} emissiveMap={tex.front} emissive="#ffffff" emissiveIntensity={CARD_EMISSIVE} roughness={0.55} metalness={0.1} />
            ) : k === axis * 2 + 1 ? (
              <meshStandardMaterial key={k} attach={`material-${k}`} map={tex.back} emissiveMap={tex.back} emissive="#ffffff" emissiveIntensity={CARD_EMISSIVE} roughness={0.55} metalness={0.1} />
            ) : (
              <meshStandardMaterial key={k} attach={`material-${k}`} color="#0a0a14" roughness={0.7} metalness={0.2} />
            ),
          )
        ) : (
          <meshStandardMaterial color={spec.color} metalness={0.15} roughness={0.5} />
        )}
      </mesh>
      {foil && tex && (
        <mesh position={foilPos} rotation={foilRot} material={foil} raycast={() => null}>
          <planeGeometry args={[foilW, foilH]} />
        </mesh>
      )}
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

/**
 * Cœur d'interaction (dans le Canvas) : un seul jeu de Pointer Events couvre souris + tactile.
 * - tap (appui sans franchir le seuil) → pousse la carte (impulsion) ;
 * - drag (au-delà du seuil) → « attrape » la carte : elle suit le pointeur en kinématique,
 *   se met de face/avance au centre de l'écran, et au relâché retombe avec une légère rotation.
 */
function Grabbable({
  live,
  grabbedId,
  setLive,
  setGrabbedId,
  bodies,
  textures,
  deck,
}: {
  live: boolean;
  grabbedId: number | null;
  setLive: (v: boolean) => void;
  setGrabbedId: (v: number | null) => void;
  bodies: React.RefObject<Map<number, RapierRigidBody>>;
  textures: CardTex[] | null;
  deck: CardData[];
}) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const raycaster = useThree((s) => s.raycaster);

  const gesture = useRef<Gesture | null>(null);
  const ndc = useRef(new THREE.Vector2());
  const anchor = useRef(new THREE.Vector3());

  const updateNdc = useCallback(
    (clientX: number, clientY: number) => {
      const r = gl.domElement.getBoundingClientRect();
      ndc.current.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    },
    [gl],
  );

  const register = useCallback(
    (i: number, body: RapierRigidBody | null) => {
      if (body) bodies.current.set(i, body);
      else bodies.current.delete(i);
    },
    [bodies],
  );

  const onHoverCursor = useCallback(
    (hover: boolean) => {
      if (!gesture.current) gl.domElement.style.cursor = hover ? "grab" : "";
    },
    [gl],
  );

  const onCardPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, i: number) => {
      e.stopPropagation();
      try {
        gl.domElement.setPointerCapture(e.pointerId); // garde move/up même si le pointeur quitte le mesh/canvas
      } catch {
        /* pointeur déjà relâché / non capturable */
      }
      updateNdc(e.nativeEvent.clientX, e.nativeEvent.clientY);
      gesture.current = { id: i, pointerId: e.pointerId, x0: e.nativeEvent.clientX, y0: e.nativeEvent.clientY, dragging: false };
      gl.domElement.style.cursor = "grabbing";
    },
    [gl, updateNdc],
  );

  // Move/up au niveau du canvas : robuste aux drags rapides (pointer capture).
  useEffect(() => {
    const el = gl.domElement;

    function onMove(e: PointerEvent) {
      const g = gesture.current;
      if (!g) return;
      updateNdc(e.clientX, e.clientY);
      if (!g.dragging) {
        const dx = e.clientX - g.x0;
        const dy = e.clientY - g.y0;
        if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
          g.dragging = true;
          const b = bodies.current.get(g.id);
          if (b) {
            const t = b.translation();
            anchor.current.set(t.x, t.y, t.z); // profondeur de saisie pour le plan de suivi
          }
          setLive(true); // retirer une carte porteuse fait s'effondrer le reste
          setGrabbedId(g.id);
        }
      }
    }

    function onEnd(e: PointerEvent) {
      const g = gesture.current;
      if (!g || e.pointerId !== g.pointerId) return;
      try {
        el.releasePointerCapture(g.pointerId);
      } catch {
        /* déjà relâché */
      }
      el.style.cursor = "";
      const id = g.id;

      if (!g.dragging) {
        // TAP → pousser la carte
        setLive(true);
        raycaster.setFromCamera(ndc.current, camera);
        const dx = raycaster.ray.direction.x;
        const dz = raycaster.ray.direction.z;
        // 2 frames pour laisser le corps passer en dynamique avant l'impulsion
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const body = bodies.current.get(id);
            if (!body) return;
            body.applyImpulse({ x: dx * PUSH_LIN, y: PUSH_UP, z: dz * PUSH_LIN }, true);
            body.applyTorqueImpulse(
              { x: (Math.random() - 0.5) * PUSH_SPIN, y: (Math.random() - 0.5) * PUSH_SPIN, z: (Math.random() - 0.5) * PUSH_SPIN },
              true,
            );
          }),
        );
      } else {
        // RELÂCHÉ → la carte tombe (pas de lancer) avec une légère rotation
        setGrabbedId(null);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const body = bodies.current.get(id);
            if (!body) return;
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            body.applyTorqueImpulse(
              { x: (Math.random() - 0.5) * RELEASE_SPIN, y: (Math.random() - 0.5) * RELEASE_SPIN, z: (Math.random() - 0.5) * RELEASE_SPIN },
              true,
            );
          }),
        );
      }
      gesture.current = null;
    }

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onEnd);
    el.addEventListener("pointercancel", onEnd);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onEnd);
      el.removeEventListener("pointercancel", onEnd);
    };
  }, [gl, camera, raycaster, setLive, setGrabbedId, bodies, updateNdc]);

  // Boucle de suivi de la carte saisie (kinématique → pousse correctement les autres cartes).
  useFrame((state) => {
    if (grabbedId == null) return;
    const b = bodies.current.get(grabbedId);
    if (!b || !b.isKinematic()) return; // attend que le corps soit bien passé kinématique
    if (!grabbedPose(ndc.current, state.camera, raycaster, anchor.current, _pos, _quat)) return;
    b.setNextKinematicTranslation(_pos);
    b.setNextKinematicRotation(_quat);
  });

  return (
    <>
      <Ground />
      {CASTLE.map((spec, i) => {
        const card = deck[i % deck.length]; // emplacement → carte du deck (cycle)
        return (
          <PhysCard
            key={i}
            index={i}
            spec={spec}
            type={i === grabbedId ? "kinematicPosition" : live ? "dynamic" : "fixed"}
            tex={textures?.[i % deck.length] ?? null}
            level={card.level}
            register={register}
            onPointerDown={onCardPointerDown}
            onHoverCursor={onHoverCursor}
          />
        );
      })}
    </>
  );
}

export interface CardCastleProps {
  /** Si true, le viewport WebGL occupe 100 % du conteneur parent (route produit `/chateau`). */
  fill?: boolean;
  /** Largeur fixe (px) — ignorée si `fill`. */
  width?: number;
  /** Hauteur fixe (px) — ignorée si `fill`. */
  height?: number;
  /** Cartes du membre ; vide → démo (4 niveaux). */
  cards?: CardData[];
}

/** Château de cartes physique — figé au départ ; tap = pousser, glisser = attraper. */
export default function CardCastle({ fill = false, width = 680, height = 540, cards }: CardCastleProps) {
  const deck = useMemo(() => resolveCastleDeck(cards), [cards]);
  const [resetKey, setResetKey] = useState(0);
  const [live, setLive] = useState(false);
  const [grabbedId, setGrabbedId] = useState<number | null>(null);
  const [textures, setTextures] = useState<CardTex[] | null>(null);
  const bodies = useRef<Map<number, RapierRigidBody>>(new Map());

  function reset() {
    setLive(false);
    setGrabbedId(null);
    setResetKey((k) => k + 1);
  }

  const hint = grabbedId != null ? "✋ Carte en main — relâche pour la lâcher" : live ? "💥 Château effondré" : "👆 Tape une carte · glisse pour l'attraper";

  const shellStyle = fill
    ? ({ width: "100%", height: "100%", position: "relative", touchAction: "none" } as const)
    : ({
        width: "100%",
        maxWidth: width,
        height,
        position: "relative",
        margin: "0 auto",
        touchAction: "none",
      } as const);

  return (
    <div style={shellStyle}>
      <CardTextureBaker cards={deck} onReady={setTextures} />
      <Canvas
        dpr={[1, 2]}
        style={{ width: "100%", height: "100%", display: "block" }}
        camera={{ position: [5, 3.4, 9.5], fov: 44 }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = "none"; // mobile : pas de scroll/zoom de page pendant le drag
        }}
      >
        <color attach="background" args={["#0b0c10"]} />
        <Rig />
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 10, 6]} intensity={2.6} />
        <pointLight position={[-5, 4, 4]} intensity={30} color="#8A2BE2" />
        <pointLight position={[5, 3, 3]} intensity={20} color="#39FF14" />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={14} blur={2.2} far={5} color="#000000" />
        <Suspense fallback={null}>
          <Physics key={resetKey} gravity={[0, -9.81, 0]}>
            <Grabbable live={live} grabbedId={grabbedId} setLive={setLive} setGrabbedId={setGrabbedId} bodies={bodies} textures={textures} deck={deck} />
          </Physics>
        </Suspense>
        <DevPerf position="top-left" minimal />
      </Canvas>

      <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12, alignItems: "center", pointerEvents: "none" }}>
        <span style={{ fontSize: 12, color: "var(--hub-fg-soft)" }}>{hint}</span>
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
