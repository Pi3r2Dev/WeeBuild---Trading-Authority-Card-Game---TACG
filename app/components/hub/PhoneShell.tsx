import type { ReactNode } from "react";
import { DevNav } from "../DevNav";
import { PhoneFrame } from "./primitives";

/** Coque commune des écrans mobile : DevNav + cadre téléphone centré. */
export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "56px 16px 48px",
      }}
    >
      <DevNav />
      <PhoneFrame>{children}</PhoneFrame>
    </main>
  );
}
