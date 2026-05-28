"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CardData } from "../card/types";
import {
  HAND_DRAG_THRESHOLD,
  handGrabTiltDeg,
  isHandDragGesture,
} from "@/lib/hub/hand-gesture";

type Gesture = {
  cardId: string;
  pointerId: number;
  x0: number;
  y0: number;
  dragging: boolean;
  card: CardData;
};

export type GrabbedHandCard = {
  card: CardData;
  x: number;
  y: number;
  tiltDeg: number;
};

/**
 * Gestes « Ma main » : tap → fiche carte ; drag → attraper et jouer (cf. CardCastle).
 * Pointer capture sur le slot pour garder le suivi même hors du mesh.
 */
export function useHandCardGesture() {
  const router = useRouter();
  const gesture = useRef<Gesture | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [grabbed, setGrabbed] = useState<GrabbedHandCard | null>(null);

  const onCardPointerDown = useCallback((e: React.PointerEvent<HTMLElement>, card: CardData) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* non capturable */
    }
    gesture.current = {
      cardId: card.id,
      card,
      pointerId: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      dragging: false,
    };
  }, []);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const g = gesture.current;
      if (!g || e.pointerId !== g.pointerId) return;

      const dx = e.clientX - g.x0;
      const dy = e.clientY - g.y0;

      if (!g.dragging && isHandDragGesture(dx, dy, HAND_DRAG_THRESHOLD)) {
        g.dragging = true;
        setGrabbed({
          card: g.card,
          x: e.clientX,
          y: e.clientY,
          tiltDeg: handGrabTiltDeg(dx),
        });
        return;
      }

      if (g.dragging) {
        setGrabbed({
          card: g.card,
          x: e.clientX,
          y: e.clientY,
          tiltDeg: handGrabTiltDeg(dx),
        });
      }
    }

    function onEnd(e: PointerEvent) {
      const g = gesture.current;
      if (!g || e.pointerId !== g.pointerId) return;

      if (!g.dragging) {
        router.push(`/carte/${g.cardId}`);
      } else {
        setGrabbed(null);
      }
      gesture.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }, [router]);

  return {
    hoveredId,
    setHoveredId,
    grabbed,
    onCardPointerDown,
  };
}
