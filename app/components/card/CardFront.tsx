import type { CardData, Level } from "./types";
import { ERA_LABEL } from "./types";
import { ElementGlyph, GemBadgeRecto, LevelDots } from "./glyphs";
import { StatBar } from "./StatBar";
import { SiteShot } from "./SiteShot";
import { SitePortrait } from "./SitePortrait";

/**
 * Recto du Gabarit D « Badge tactique » (itération polie) :
 * gemme recto + n° d'édition + N3/N4. L'habillage par niveau vient
 * des variables CSS de `.lvl-N` (tokens.css) ; seuls les écarts de
 * structure par ère sont gérés ici via les flags isGB/isPS2/isHolo.
 */
export function CardFront({ data, level }: { data: CardData; level: Level }) {
  const hpPct = Math.min(100, (data.hp / 100) * 100);
  const atkPct = Math.min(100, (data.atk / 100) * 100);

  const isPS2 = level === 3;
  const isHolo = level === 4;
  const isGB = level === 1;

  return (
    <div
      className={isGB ? "lcd-scanlines" : ""}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: isPS2 || isHolo ? undefined : "var(--c-card)",
        border: "var(--frame-border)",
        borderRadius: "var(--frame-radius)",
        overflow: "hidden",
        fontFamily: "var(--font-body)",
        color: "var(--c-fg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {isHolo && <div className="holo-foil" style={{ position: "absolute", inset: 0, zIndex: 0 }} />}
      {isPS2 && <div className="ps2-bloom" style={{ position: "absolute", inset: 0, zIndex: 0 }} />}

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Top bar — gemme + domaine + niveau */}
        <div
          className={isPS2 ? "ps2-chrome" : ""}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 10px 8px 12px",
            borderBottom: isHolo
              ? "1px solid rgba(255,255,255,0.2)"
              : isPS2
                ? "1px solid #0a1638"
                : "2px solid var(--c-frame)",
            background: isHolo ? "rgba(0,0,0,0.4)" : "transparent",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <GemBadgeRecto type={data.linkType} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 9,
                  color: isPS2 ? "#0a1638" : isGB ? "var(--c-deep)" : "var(--c-fg)",
                  letterSpacing: 0.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {data.domain}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 6,
                  color: isPS2 ? "rgba(10,22,56,0.7)" : "var(--c-fg-soft)",
                  letterSpacing: 1,
                  marginTop: 3,
                }}
              >
                {ERA_LABEL[level]} · {data.linkType.toUpperCase()}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: isPS2 ? "#0a1638" : isGB ? "var(--c-deep)" : "var(--c-fg)",
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: 8 }}>LV.{level}</span>
            <LevelDots level={level} />
          </div>
        </div>

        {/* Portrait + ribbon élément */}
        <div style={{ display: "flex", padding: 12, gap: 10, alignItems: "stretch", position: "relative" }}>
          <div
            className={isPS2 ? "ps2-chrome" : ""}
            style={{
              width: 30,
              background: isHolo ? "rgba(255,255,255,0.06)" : isPS2 ? undefined : "var(--c-frame)",
              color: isPS2
                ? "#0a1638"
                : isGB
                  ? "var(--c-pale)"
                  : level === 2
                    ? "var(--c-deep)"
                    : "var(--c-element)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              border: isHolo ? "1px solid rgba(255,255,255,0.2)" : "none",
              borderRadius: isPS2 ? 4 : 0,
            }}
          >
            <ElementGlyph el={data.element} size={20} />
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                fontFamily: "var(--font-display)",
                fontSize: 7,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {data.thematique}
            </span>
          </div>
          <div
            className={isPS2 ? "ps2-flare" : ""}
            style={{
              position: "relative",
              flex: 1,
              aspectRatio: "1/1",
              background: "var(--c-deep)",
              border: isHolo
                ? "1px solid rgba(255,255,255,0.25)"
                : isPS2
                  ? "1px solid rgba(148,163,184,0.55)"
                  : "3px solid var(--c-frame)",
              borderRadius: isPS2 ? 4 : 0,
              overflow: "hidden",
            }}
          >
            {data.visualAssets ? (
              <SitePortrait level={level} assets={data.visualAssets} domain={data.domain} />
            ) : (
              <SiteShot level={level} />
            )}
            <div
              style={{
                position: "absolute",
                bottom: 4,
                right: 4,
                padding: "2px 6px",
                background: "rgba(0,0,0,0.78)",
                color: isGB ? "#9bbc0f" : "#fff",
                fontFamily: "var(--font-pixel-body)",
                fontSize: 14,
                letterSpacing: 0.5,
                borderRadius: 2,
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              {data.edition} / {data.editionTotal}
            </div>
          </div>
        </div>

        {/* Stats en barres */}
        <div style={{ padding: "4px 12px 10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <StatBar label="HP" value={data.hp} pct={hpPct} color={isGB ? "var(--c-deep)" : "var(--c-hp)"} level={level} />
          <StatBar label="ATK" value={data.atk} pct={atkPct} color={isGB ? "var(--c-deep)" : "var(--c-atk)"} level={level} />
        </div>

        {/* Résumé */}
        <div
          style={{
            margin: "0 12px 12px 12px",
            padding: "10px 12px",
            background: isHolo ? "rgba(0,0,0,0.5)" : isPS2 ? "rgba(10,22,56,0.7)" : "var(--c-deep)",
            color: isGB ? "var(--c-pale)" : "var(--c-fg)",
            fontSize: 16,
            lineHeight: 1.2,
            flex: 1,
            border: isHolo
              ? "1px solid rgba(255,255,255,0.18)"
              : isPS2
                ? "1px solid rgba(148,163,184,0.35)"
                : "none",
            borderRadius: isHolo || isPS2 ? 4 : 0,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 7,
              color: isGB ? "var(--c-light)" : "var(--c-fg-soft)",
              letterSpacing: 1.5,
              marginBottom: 6,
            }}
          >
            {"// RÉSUMÉ"}
          </div>
          {data.summary}
        </div>
      </div>
    </div>
  );
}
