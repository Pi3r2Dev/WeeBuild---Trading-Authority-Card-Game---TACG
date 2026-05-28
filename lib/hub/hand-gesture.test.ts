import { describe, expect, it } from "vitest";
import {
  HAND_DRAG_THRESHOLD,
  handGrabTiltDeg,
  isHandDragGesture,
} from "./hand-gesture";

describe("isHandDragGesture", () => {
  it("reste un tap sous le seuil", () => {
    expect(isHandDragGesture(0, 0)).toBe(false);
    expect(isHandDragGesture(HAND_DRAG_THRESHOLD - 1, 0)).toBe(false);
    expect(isHandDragGesture(0, HAND_DRAG_THRESHOLD - 1)).toBe(false);
  });

  it("devient un drag au-delà du seuil", () => {
    expect(isHandDragGesture(HAND_DRAG_THRESHOLD + 1, 0)).toBe(true);
    expect(isHandDragGesture(0, HAND_DRAG_THRESHOLD + 1)).toBe(true);
    expect(isHandDragGesture(10, 10)).toBe(true);
  });
});

describe("handGrabTiltDeg", () => {
  it("reste dans les bornes", () => {
    expect(handGrabTiltDeg(0)).toBe(0);
    expect(handGrabTiltDeg(500)).toBe(16);
    expect(handGrabTiltDeg(-500)).toBe(-16);
  });

  it("scale proportionnellement au déplacement horizontal", () => {
    expect(handGrabTiltDeg(100)).toBe(6);
  });
});
