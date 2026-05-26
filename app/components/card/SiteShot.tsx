import type { Level } from "./types";

/**
 * Faux screenshot du site, stylisé par niveau — recomposition graphique
 * fidèle à chaque palette (placeholder de la future image auto-générée).
 * Les sous-composants sont statiques (pas de données site pour l'instant).
 */
export function SiteShot({ level }: { level: Level }) {
  switch (level) {
    case 1:
      return <SiteShotGB />;
    case 2:
      return <SiteShotSNES />;
    case 3:
      return <SiteShotPS2 />;
    case 4:
      return <SiteShotHolo />;
    default:
      return null;
  }
}

// ── N1 Game Boy : 4 nuances vert olive, dithering, scanlines ──
function SiteShotGB() {
  return (
    <svg
      viewBox="0 0 160 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }}
      shapeRendering="crispEdges"
    >
      <defs>
        <pattern id="dith-mid" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="#8bac0f" />
          <rect x="0" y="0" width="1" height="1" fill="#306230" />
        </pattern>
        <pattern id="dith-dark" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="#306230" />
          <rect x="0" y="0" width="1" height="1" fill="#0f380f" />
          <rect x="1" y="1" width="1" height="1" fill="#0f380f" />
        </pattern>
      </defs>
      <rect width="160" height="120" fill="#9bbc0f" />
      <rect x="0" y="0" width="160" height="14" fill="#0f380f" />
      <rect x="6" y="4" width="40" height="6" fill="#9bbc0f" />
      <rect x="120" y="4" width="6" height="6" fill="#9bbc0f" />
      <rect x="130" y="4" width="6" height="6" fill="#9bbc0f" />
      <rect x="140" y="4" width="6" height="6" fill="#9bbc0f" />
      <rect x="8" y="22" width="64" height="60" fill="url(#dith-mid)" />
      <rect x="8" y="22" width="64" height="60" fill="none" stroke="#0f380f" strokeWidth="1" />
      <g fill="#0f380f">
        <rect x="28" y="36" width="24" height="6" />
        <rect x="24" y="42" width="32" height="22" />
        <rect x="20" y="50" width="8" height="10" />
        <rect x="52" y="50" width="8" height="10" />
        <rect x="30" y="64" width="6" height="10" />
        <rect x="44" y="64" width="6" height="10" />
      </g>
      <rect x="80" y="24" width="72" height="4" fill="#0f380f" />
      <rect x="80" y="32" width="56" height="3" fill="#306230" />
      <rect x="80" y="38" width="64" height="3" fill="#306230" />
      <rect x="80" y="44" width="48" height="3" fill="#306230" />
      <rect x="80" y="56" width="24" height="10" fill="#0f380f" />
      <rect x="80" y="72" width="68" height="3" fill="#306230" />
      <rect x="80" y="78" width="60" height="3" fill="#306230" />
      <rect x="0" y="100" width="160" height="20" fill="url(#dith-dark)" />
      <rect x="8" y="106" width="40" height="4" fill="#9bbc0f" />
      <rect x="56" y="106" width="32" height="4" fill="#9bbc0f" />
      <rect x="96" y="106" width="28" height="4" fill="#9bbc0f" />
    </svg>
  );
}

// ── N2 Super NES : 16 couleurs, perspective Mode 7 ───────────
function SiteShotSNES() {
  return (
    <svg
      viewBox="0 0 160 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }}
      shapeRendering="crispEdges"
    >
      <defs>
        <linearGradient id="snes-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="0.6" stopColor="#f97316" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
        <pattern id="snes-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#1e1b4b" />
          <path d="M0 0 H16 M0 0 V16" stroke="#3730a3" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="160" height="60" fill="url(#snes-sky)" />
      <polygon points="0,60 30,30 50,60" fill="#7c3aed" />
      <polygon points="40,60 70,22 100,60" fill="#5b21b6" />
      <polygon points="90,60 120,32 160,60" fill="#7c3aed" />
      <polygon points="40,60 70,22 78,32 56,60" fill="#a78bfa" opacity="0.6" />
      <polygon points="-20,60 180,60 130,120 30,120" fill="url(#snes-grid)" />
      <g>
        <rect x="74" y="78" width="12" height="6" fill="#fbbf24" />
        <rect x="72" y="84" width="16" height="14" fill="#dc2626" />
        <rect x="70" y="92" width="20" height="6" fill="#1e3a8a" />
        <rect x="72" y="98" width="6" height="8" fill="#1e3a8a" />
        <rect x="82" y="98" width="6" height="8" fill="#1e3a8a" />
        <rect x="78" y="80" width="2" height="2" fill="#0f172a" />
        <rect x="82" y="80" width="2" height="2" fill="#0f172a" />
      </g>
      <rect x="4" y="4" width="48" height="10" fill="#1e1b4b" />
      <rect x="6" y="6" width="44" height="6" fill="#fbbf24" />
      <rect x="108" y="4" width="48" height="10" fill="#1e1b4b" />
      <rect x="110" y="6" width="44" height="6" fill="#22d3ee" />
      <ellipse cx="30" cy="22" rx="10" ry="4" fill="#fef3c7" opacity="0.85" />
      <ellipse cx="130" cy="18" rx="12" ry="4" fill="#fef3c7" opacity="0.85" />
    </svg>
  );
}

// ── N3 PlayStation 2 : couleurs délavées, bloom, lens flare ──
function SiteShotPS2() {
  return (
    <div className="ps2-bloom" style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <svg
        viewBox="0 0 160 120"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%", display: "block", position: "relative", zIndex: 1 }}
      >
        <defs>
          <linearGradient id="ps2-nav" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#cbd5e1" stopOpacity="0.9" />
            <stop offset="1" stopColor="#475569" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="ps2-tile" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="1" stopColor="#1e3a8a" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="ps2-orb" cx="0.35" cy="0.35">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="0.5" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#7c2d12" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="160" height="12" fill="url(#ps2-nav)" />
        <rect x="6" y="4" width="32" height="4" fill="#0a1638" />
        <circle cx="142" cy="6" r="1.6" fill="#0a1638" />
        <circle cx="148" cy="6" r="1.6" fill="#0a1638" />
        <circle cx="154" cy="6" r="1.6" fill="#0a1638" />
        <rect x="8" y="18" width="144" height="48" rx="3" fill="rgba(15,23,42,0.55)" stroke="#60a5fa" strokeWidth="0.6" />
        <circle cx="42" cy="42" r="16" fill="url(#ps2-orb)" />
        <ellipse cx="38" cy="36" rx="6" ry="3" fill="#fff" opacity="0.5" />
        <ellipse cx="42" cy="60" rx="14" ry="2" fill="#000" opacity="0.4" />
        <rect x="68" y="26" width="78" height="5" fill="#f1f5f9" />
        <rect x="68" y="34" width="62" height="3" fill="#94a3b8" />
        <rect x="68" y="40" width="70" height="3" fill="#94a3b8" />
        <rect x="68" y="50" width="20" height="8" rx="2" fill="#60a5fa" />
        <rect x="92" y="50" width="20" height="8" rx="2" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
        <rect x="8" y="72" width="44" height="36" rx="3" fill="url(#ps2-tile)" stroke="#94a3b8" strokeWidth="0.5" />
        <rect x="58" y="72" width="44" height="36" rx="3" fill="url(#ps2-tile)" stroke="#94a3b8" strokeWidth="0.5" />
        <rect x="108" y="72" width="44" height="36" rx="3" fill="url(#ps2-tile)" stroke="#94a3b8" strokeWidth="0.5" />
        <rect x="12" y="76" width="36" height="20" fill="rgba(96,165,250,0.6)" />
        <rect x="62" y="76" width="36" height="20" fill="rgba(96,165,250,0.6)" />
        <rect x="112" y="76" width="36" height="20" fill="rgba(96,165,250,0.6)" />
        <rect x="12" y="98" width="22" height="3" fill="#fff" />
        <rect x="62" y="98" width="28" height="3" fill="#fff" />
        <rect x="112" y="98" width="20" height="3" fill="#fff" />
        <rect x="0" y="114" width="160" height="6" fill="rgba(10,22,56,0.9)" />
      </svg>
      <div className="ps2-flare" style={{ position: "absolute", inset: 0, zIndex: 2 }} />
    </div>
  );
}

// ── N4 Holo : screenshot full color + foil overlay + glitch ──
function SiteShotHolo() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#0a0a14" }}>
      <svg
        viewBox="0 0 160 120"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%", display: "block", position: "relative", zIndex: 1 }}
      >
        <defs>
          <linearGradient id="holo-page" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#1e1b4b" />
            <stop offset="1" stopColor="#0a0a14" />
          </linearGradient>
          <linearGradient id="holo-card" x1="0" x2="1">
            <stop offset="0" stopColor="#ff007f" />
            <stop offset="0.5" stopColor="#7f00ff" />
            <stop offset="1" stopColor="#00ffff" />
          </linearGradient>
        </defs>
        <rect width="160" height="120" fill="url(#holo-page)" />
        <rect x="0" y="0" width="160" height="10" fill="#0a0a14" />
        <rect x="6" y="3" width="28" height="4" fill="url(#holo-card)" rx="1" />
        <circle cx="148" cy="5" r="2" fill="#fbbf24" />
        <rect x="8" y="16" width="144" height="44" rx="3" fill="url(#holo-card)" opacity="0.85" />
        <rect x="14" y="22" width="80" height="5" fill="#ffffff" />
        <rect x="14" y="30" width="64" height="3" fill="rgba(255,255,255,0.7)" />
        <rect x="14" y="36" width="72" height="3" fill="rgba(255,255,255,0.7)" />
        <rect x="14" y="46" width="22" height="8" fill="#fbbf24" rx="2" />
        <rect x="40" y="46" width="22" height="8" fill="#0a0a14" rx="2" stroke="#ffffff" />
        <rect x="8" y="68" width="40" height="36" rx="2" fill="#1e1b4b" stroke="#7f00ff" />
        <rect x="58" y="68" width="40" height="36" rx="2" fill="#1e1b4b" stroke="#00ffff" />
        <rect x="108" y="68" width="40" height="36" rx="2" fill="#1e1b4b" stroke="#ff007f" />
        <rect x="12" y="72" width="32" height="20" fill="#7f00ff" opacity="0.5" />
        <rect x="62" y="72" width="32" height="20" fill="#00ffff" opacity="0.5" />
        <rect x="112" y="72" width="32" height="20" fill="#ff007f" opacity="0.5" />
        <rect x="12" y="94" width="24" height="3" fill="#fff" />
        <rect x="62" y="94" width="20" height="3" fill="#fff" />
        <rect x="112" y="94" width="26" height="3" fill="#fff" />
        <rect x="0" y="112" width="160" height="8" fill="#0a0a14" />
      </svg>
      <div
        className="holo-foil"
        style={{ position: "absolute", inset: 0, zIndex: 2, mixBlendMode: "color-dodge", opacity: 0.55 }}
      />
      <div className="glitch-strip" style={{ top: "12%", left: "4%", zIndex: 3 }}>
        &lt;a href=&quot;…&quot; rel=&quot;dofollow&quot;&gt;
      </div>
      <div className="glitch-strip" style={{ bottom: "8%", right: "6%", zIndex: 3 }}>
        TF: 92 / DR: 96
      </div>
    </div>
  );
}
