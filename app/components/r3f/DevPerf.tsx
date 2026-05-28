"use client";

import type { ComponentType } from "react";

type PerfProps = {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  minimal?: boolean;
};

/**
 * Overlay FPS `r3f-perf` — chargé en dev, stub null en prod (alias webpack).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Perf } = require("r3f-perf") as typeof import("r3f-perf");

export const DevPerf: ComponentType<PerfProps> =
  process.env.NODE_ENV === "development" ? Perf : () => null;
