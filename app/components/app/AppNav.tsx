"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_WORDMARK } from "@/lib/brand/site";
import { ACCENT_VIOLET } from "../hub/constants";

/** Items de navigation produit — source unique pour les deux variantes. */
export const NAV_ITEMS = [
  { href: "/", label: "Hub", icon: "⬢" },
  { href: "/chateau", label: "Château", icon: "△" },
  { href: "/ecosysteme", label: "Écosystème", icon: "◯" },
  { href: "/donner", label: "Donner", icon: "↗" },
  { href: "/decouvrir", label: "Découvrir", icon: "◆" },
  { href: "/preuves", label: "Preuves", icon: "⌖" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Navigation produit unifiée (généralise l'ancienne `BottomNav`).
 *  - `variant="bottom"` : barre d'onglets fixée en bas (mobile, cibles ≥44px).
 *  - `variant="rail"`   : rail vertical « console » (desktop : glyphes pixel
 *    agrandis + label, plus un bloc identité crédits/avatar en bas).
 * Le routing + l'onglet actif (dérivé du pathname) sont identiques aux deux.
 */
export function AppNav({
  variant,
  footer,
}: {
  variant: "bottom" | "rail";
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();

  if (variant === "rail") {
    return (
      <nav
        aria-label="Navigation"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "20px 12px 16px",
          gap: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 8px 18px",
            fontFamily: "var(--font-pixel-display)",
            fontSize: 9,
            letterSpacing: 2,
            color: ACCENT_VIOLET,
            textShadow: `0 0 12px ${ACCENT_VIOLET}88`,
          }}
        >
          {SITE_WORDMARK}
        </div>

        {NAV_ITEMS.map((it) => {
          const on = isActive(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 14,
                minHeight: 48,
                padding: "0 14px",
                borderRadius: 10,
                textDecoration: "none",
                color: on ? "#fff" : "var(--hub-fg-soft)",
                background: on ? "rgba(138,43,226,0.16)" : "transparent",
                border: `1px solid ${on ? "rgba(138,43,226,0.45)" : "transparent"}`,
                fontFamily: "var(--font-hub)",
                fontSize: 14,
                fontWeight: on ? 700 : 500,
                letterSpacing: 0.2,
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {on && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 3,
                    height: 22,
                    background: ACCENT_VIOLET,
                    borderRadius: 2,
                    boxShadow: `0 0 8px ${ACCENT_VIOLET}`,
                  }}
                />
              )}
              <span style={{ fontSize: 22, lineHeight: 1, width: 24, textAlign: "center", color: on ? ACCENT_VIOLET : "inherit" }}>
                {it.icon}
              </span>
              <span>{it.label}</span>
            </Link>
          );
        })}

        {footer && <div style={{ marginTop: "auto" }}>{footer}</div>}
      </nav>
    );
  }

  // variant === "bottom"
  return (
    <nav
      aria-label="Navigation"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        minHeight: 64,
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        background: "rgba(13,14,21,0.96)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        zIndex: 20,
      }}
    >
      {NAV_ITEMS.map((it) => {
        const on = isActive(pathname, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              minHeight: 44,
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
    </nav>
  );
}
