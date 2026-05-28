/** Seuil px (comme CardCastle) : sous ce déplacement, le relâché = tap ; au-delà = drag. */
export const HAND_DRAG_THRESHOLD = 8;

/** Échelle éventail par défaut dans le hub. */
export const HAND_FAN_SCALE = 0.34;

/** Échelle quand la carte est attrapée (plus lisible). */
export const HAND_GRAB_SCALE = 0.48;

/** Zoom au survol (facteur multiplicatif sur l'échelle fan). */
export const HAND_HOVER_ZOOM = 1.14;

/** Translation Y au survol (px). */
export const HAND_HOVER_LIFT = 18;

/**
 * Indique si le déplacement du pointeur dépasse le seuil tap/drag.
 */
export function isHandDragGesture(
  dx: number,
  dy: number,
  threshold = HAND_DRAG_THRESHOLD,
): boolean {
  return dx * dx + dy * dy > threshold * threshold;
}

/**
 * Inclinaison légère pendant le drag (deg), bornée pour rester lisible.
 */
export function handGrabTiltDeg(dx: number, maxDeg = 16, factor = 0.06): number {
  return Math.max(-maxDeg, Math.min(maxDeg, dx * factor));
}
