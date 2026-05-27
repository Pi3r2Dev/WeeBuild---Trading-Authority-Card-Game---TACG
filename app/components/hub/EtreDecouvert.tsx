import { ACCENT_VIOLET } from "./constants";
import { getMe, getMyDeck } from "@/lib/data";
import { DEMO_USER_ID } from "@/lib/data/demo-user";
import { Body, CreditsBadge, ScreenHeader, SectionLabel, StatusBar } from "./primitives";
import { BottomNav } from "./BottomNav";
import { MyHand } from "./MiniCard";
import { icons } from "./icons";

const FILTERS = ["Tech", "IA", "SEO", "Dev", "Productivité"];

/** « Soyez découvert » : dépenser des crédits pour que l’IA vous propose. */
export async function EtreDecouvert() {
  // TODO(4a): remplacer DEMO_USER_ID par (await requireSession()).user.id
  const [ME, MY_SITES] = await Promise.all([getMe(DEMO_USER_ID), getMyDeck(DEMO_USER_ID)]);

  return (
    <>
      <StatusBar />
      <Body>
        <ScreenHeader
          title="Soyez découvert"
          subtitle="Dépensez des crédits pour que l'IA vous propose à des éditeurs alignés."
          right={<CreditsBadge value={ME.credits} size="lg" />}
        />

        <SectionLabel>QUELLE CARTE BRANDIR ?</SectionLabel>
        <MyHand sites={MY_SITES} />

        <SectionLabel>BUDGET D’ÉTENDARD</SectionLabel>
        <div style={{ padding: 14, background: "rgba(138,43,226,0.08)", border: "1px solid rgba(138,43,226,0.4)", borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--font-pixel-display)", fontSize: 8, color: "var(--hub-fg-soft)", letterSpacing: 1.5 }}>CRÉDITS DÉPENSÉS</span>
            <span style={{ fontFamily: "var(--font-hub)", fontSize: 24, fontWeight: 700, color: ACCENT_VIOLET, display: "flex", alignItems: "center", gap: 6 }}>
              {icons.diamond(18)} 12
            </span>
          </div>
          {/* Slider (mock) */}
          <div style={{ position: "relative", height: 28, marginTop: 10 }}>
            <div style={{ position: "absolute", top: 12, left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }} />
            <div style={{ position: "absolute", top: 12, left: 0, width: "25%", height: 4, background: ACCENT_VIOLET, borderRadius: 2, boxShadow: `0 0 8px ${ACCENT_VIOLET}` }} />
            <div style={{ position: "absolute", top: 4, left: "calc(25% - 10px)", width: 20, height: 20, background: "#fff", borderRadius: "50%", boxShadow: `0 0 12px ${ACCENT_VIOLET}, 0 0 0 2px ${ACCENT_VIOLET}` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--hub-fg-soft)", marginTop: 4, fontFamily: "var(--font-pixel-display)", letterSpacing: 1 }}>
            <span>1</span>
            <span>12</span>
            <span>24</span>
            <span>47 (MAX)</span>
          </div>
        </div>

        <SectionLabel>ESTIMATION IA</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <EstimCard k="Éditeurs ciblés" v="6" />
          <EstimCard k="Suggestions" v="~3" />
          <EstimCard k="Délai moyen" v="48h" />
        </div>

        <SectionLabel>FILTRES</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {FILTERS.map((f) => (
            <span
              key={f}
              style={{
                padding: "5px 10px",
                background: "rgba(138,43,226,0.18)",
                border: "1px solid rgba(138,43,226,0.5)",
                color: ACCENT_VIOLET,
                fontFamily: "var(--font-hub)",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 999,
              }}
            >
              {f}
            </span>
          ))}
          <span style={{ padding: "5px 10px", background: "transparent", border: "1px dashed rgba(255,255,255,0.25)", color: "var(--hub-fg-soft)", fontSize: 11, borderRadius: 999, cursor: "pointer" }}>
            + ajouter
          </span>
        </div>

        {/* Ligne rouge produit */}
        <div style={{ marginTop: 18, padding: "10px 12px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 6, fontSize: 11, lineHeight: 1.4, color: "#fde68a" }}>
          <strong>Aucune garantie de citation.</strong> Vous payez pour la découverte éditoriale, pas pour un backlink. Les éditeurs restent libres.
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button
            style={{ flex: 1, height: 48, background: ACCENT_VIOLET, color: "#fff", fontFamily: "var(--font-hub)", fontWeight: 700, fontSize: 14, border: "none", borderRadius: 8, cursor: "pointer", boxShadow: `0 0 18px ${ACCENT_VIOLET}66` }}
          >
            Brandir l’étendard
          </button>
        </div>
      </Body>
      <BottomNav />
    </>
  );
}

function EstimCard({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ padding: "10px 8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontFamily: "var(--font-pixel-display)", fontSize: 7, color: "var(--hub-fg-soft)", letterSpacing: 1, textAlign: "center" }}>{k}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: "var(--hub-fg)" }}>{v}</span>
    </div>
  );
}
