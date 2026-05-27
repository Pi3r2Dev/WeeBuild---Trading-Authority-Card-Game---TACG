import Link from "next/link";

const LINK: React.CSSProperties = {
  color: "var(--hub-fg-soft)",
  textDecoration: "none",
  fontFamily: "var(--font-hub)",
  fontSize: 12,
};

/** Navigation de dev (le routing applicatif réel viendra avec les autres écrans). */
export function DevNav() {
  return (
    <nav
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 100,
        display: "flex",
        gap: 14,
        padding: "6px 12px",
        background: "rgba(13,14,21,0.8)",
        border: "1px solid var(--hub-line)",
        borderRadius: 999,
        backdropFilter: "blur(8px)",
      }}
    >
      <Link href="/" style={LINK}>
        Hub
      </Link>
      <Link href="/cards" style={LINK}>
        Cartes
      </Link>
      <Link href="/capturer" style={{ ...LINK, color: "var(--hub-accent-2)" }}>
        Capturer
      </Link>
      <Link href="/transitions" style={LINK}>
        Transitions
      </Link>
      <Link href="/rnd" style={LINK}>
        R&amp;D
      </Link>
      <Link href="/chateau" style={LINK}>
        Château
      </Link>
      <Link href="/chateau-cartes" style={LINK}>
        Cartes 3D
      </Link>
    </nav>
  );
}
