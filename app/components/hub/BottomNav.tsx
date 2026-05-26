"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCENT_VIOLET } from "./constants";

const NAV_ITEMS = [
  { href: "/", label: "Hub", icon: "⬢" },
  { href: "/ecosysteme", label: "Écosystème", icon: "◯" },
  { href: "/donner", label: "Donner", icon: "↗" },
  { href: "/decouvrir", label: "Découvrir", icon: "◆" },
  { href: "/preuves", label: "Preuves", icon: "⌖" },
];

/** Barre d'onglets — route réellement, onglet actif dérivé du pathname. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        background: "rgba(13,14,21,0.96)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        paddingBottom: 12,
        zIndex: 20,
      }}
    >
      {NAV_ITEMS.map((it) => {
        const on = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              paddingTop: 12,
              textDecoration: "none",
              color: on ? ACCENT_VIOLET : "var(--hub-fg-soft)",
              fontFamily: "var(--font-hub)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.3,
              position: "relative",
            }}
          >
            {on && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 28,
                  height: 3,
                  background: ACCENT_VIOLET,
                  borderRadius: 2,
                  boxShadow: `0 0 8px ${ACCENT_VIOLET}`,
                }}
              />
            )}
            <span style={{ fontSize: 18, lineHeight: 1 }}>{it.icon}</span>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
