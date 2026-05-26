import type { CardData, Level } from "./types";
import { GemstoneSVG } from "./glyphs";

/** Verso commun — fiche technique « métier » du site/carte. */
export function CardBack({
  data,
  level,
  gabarit = "D",
}: {
  data: CardData;
  level: Level;
  gabarit?: string;
}) {
  const isHolo = level === 4;
  const isGB = level === 1;
  return (
    <div
      className={isGB ? "lcd-scanlines" : ""}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: isHolo ? undefined : "var(--c-card)",
        border: "var(--frame-border)",
        borderRadius: "var(--frame-radius)",
        overflow: "hidden",
        color: "var(--c-fg)",
        fontFamily: "var(--font-body)",
      }}
    >
      {isHolo && <div className="holo-foil" style={{ position: "absolute", inset: 0, zIndex: 0 }} />}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          height: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 8,
            borderBottom: isHolo ? "1px solid rgba(255,255,255,0.2)" : "2px solid var(--c-frame)",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 8, letterSpacing: 1, opacity: 0.7 }}>
              FICHE TECHNIQUE · GABARIT {gabarit.slice(-1)}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 11, marginTop: 6 }}>{data.domain}</div>
          </div>
          <GemstoneSVG type={data.linkType} size={28} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 16, lineHeight: 1.15 }}>
          <DataRow k="URL CIBLE" v={data.url} level={level} />
          <DataRow k="ANCRE" v={data.anchor ? `"${data.anchor}"` : "—"} level={level} />
          <DataRow k="TYPE LIEN" v={data.linkType.toUpperCase()} level={level} />
          <DataRow k="PROPRIÉTAIRE" v={data.owner} level={level} />
          <DataRow k="STATUT" v={data.status.toUpperCase()} level={level} />
        </div>

        <div
          style={{
            marginTop: "auto",
            padding: "10px 12px",
            background: isHolo ? "rgba(0,0,0,0.4)" : "var(--c-deep)",
            color: isGB ? "var(--c-pale)" : "var(--c-fg)",
            border: isHolo ? "1px solid rgba(255,255,255,0.18)" : "none",
            borderRadius: isHolo ? 6 : 0,
          }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontSize: 7, opacity: 0.7, letterSpacing: 1.5, marginBottom: 8 }}>
            {"// MÉTRIQUES SOURCE"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              fontFamily: "var(--font-display)",
              fontSize: 9,
            }}
          >
            <Metric k="TF" v={data.tf} />
            <Metric k="CF" v={data.cf} />
            <Metric k="DR" v={data.dr} />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 10px",
            background: isHolo ? "rgba(138,43,226,0.25)" : "var(--c-frame)",
            color: level === 2 ? "var(--c-deep)" : isGB ? "var(--c-pale)" : "#fff",
            border: isHolo ? "1px solid rgba(138,43,226,0.5)" : "none",
            borderRadius: isHolo ? 6 : 0,
          }}
        >
          <span style={{ fontFamily: "var(--font-display)", fontSize: 8, letterSpacing: 1 }}>VALEUR D&apos;ÉCHANGE</span>
          <span style={{ fontFamily: isHolo ? "var(--font-techno)" : "var(--font-display)", fontSize: 16, fontWeight: 900 }}>
            {data.price} ◇
          </span>
        </div>
      </div>
    </div>
  );
}

function DataRow({ k, v, level }: { k: string; v: string; level: Level }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 7,
          color: level === 1 ? "var(--c-mid)" : "var(--c-fg-soft)",
          letterSpacing: 1,
          flexShrink: 0,
        }}
      >
        {k}
      </span>
      <span
        style={{
          flex: 1,
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "var(--c-fg)",
        }}
      >
        {v}
      </span>
    </div>
  );
}

function Metric({ k, v }: { k: string; v: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ opacity: 0.7, fontSize: 7, letterSpacing: 1 }}>{k}</span>
      <span style={{ fontSize: 14, fontWeight: 900 }}>{v}</span>
    </div>
  );
}
