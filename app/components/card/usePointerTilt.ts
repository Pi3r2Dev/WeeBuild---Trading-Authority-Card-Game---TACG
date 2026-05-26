"use client";

import { useEffect, useRef } from "react";

interface TiltOptions {
  /** Inclinaison max en degrés (sur chaque axe). */
  max?: number;
}

/**
 * Tilt 3D + variables de pointeur, façon cartes holographiques (Simey),
 * en CSS pur. Aucune mise à jour d'état React : on écrit directement des
 * custom properties sur l'élément (throttle rAF), que la carte consomme :
 *   --rx / --ry      → rotation 3D
 *   --px / --py      → position du pointeur (0–100%) pour le glare
 *   --foil-angle     → rotation du conic-gradient holographique
 *   --active         → 0 au repos, 1 au survol (intensité)
 * Respecte prefers-reduced-motion (désactive le tilt).
 */
export function usePointerTilt<T extends HTMLElement>({ max = 14 }: TiltOptions = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let raf = 0;
    let pending: { x: number; y: number } | null = null;

    const apply = () => {
      raf = 0;
      if (!pending) return;
      const rect = el.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (pending.x - rect.left) / rect.width));
      const py = Math.min(1, Math.max(0, (pending.y - rect.top) / rect.height));
      el.style.setProperty("--px", `${(px * 100).toFixed(2)}%`);
      el.style.setProperty("--py", `${(py * 100).toFixed(2)}%`);
      el.style.setProperty("--rx", `${(-(py - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty("--foil-angle", `${Math.round(px * 360)}deg`);
      el.style.setProperty("--active", "1");
    };

    const onMove = (e: PointerEvent) => {
      pending = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const reset = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--active", "0");
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    el.addEventListener("pointercancel", reset);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
      el.removeEventListener("pointercancel", reset);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [max]);

  return ref;
}
