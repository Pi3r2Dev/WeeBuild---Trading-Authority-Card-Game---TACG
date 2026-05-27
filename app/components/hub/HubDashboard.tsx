import { ACCENT_VIOLET } from "./constants";
import { getSuggestions, getMe, getMyDeck, getNavDeck, getRecentActivity } from "@/lib/data";
import { DEMO_USER_ID } from "@/lib/data/demo-user";
import { Body, CreditsBadge, ScreenHeader, SectionLabel, StatusBar } from "./primitives";
import { BottomNav } from "./BottomNav";
import { MyHand } from "./MiniCard";
import { AISuggestionTCG, ActivityRow } from "./HubWidgets";

/** Écran d'accueil après login : solde, progression, main, suggestions IA, activité. */
export async function HubDashboard() {
  // TODO(4a): remplacer DEMO_USER_ID par (await requireSession()).user.id
  const [ME, MY_SITES, NAV_DECK] = await Promise.all([
    getMe(DEMO_USER_ID),
    getMyDeck(DEMO_USER_ID),
    getNavDeck(),
  ]);
  const AI_SUGGESTIONS = getSuggestions(); // P3 — fixtures, sync
  const RECENT_ACTIVITY = getRecentActivity(); // P3 — fixtures, sync

  return (
    <>
      <StatusBar />
      <Body>
        <ScreenHeader
          title={`Salut, ${ME.name.split(" ")[0]}`}
          subtitle="3 suggestions de l'IA aujourd'hui"
          right={<CreditsBadge value={ME.credits} size="lg" />}
        />

        {/* Progression personnelle */}
        <div
          style={{
            padding: 10,
            background: "rgba(138,43,226,0.08)",
            border: "1px solid rgba(138,43,226,0.35)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 4,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: ACCENT_VIOLET,
              color: "#fff",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-pixel-display)",
              fontSize: 12,
              fontWeight: 700,
              boxShadow: `0 0 14px ${ACCENT_VIOLET}80`,
            }}
          >
            {ME.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--hub-fg)" }}>Donneur · Lv. {ME.level}</div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", marginTop: 5 }}>
              <div
                style={{
                  width: `${ME.levelProgress * 100}%`,
                  height: "100%",
                  background: ACCENT_VIOLET,
                  boxShadow: `0 0 6px ${ACCENT_VIOLET}`,
                }}
              />
            </div>
          </div>
          <span style={{ fontSize: 10, color: "var(--hub-fg-soft)" }}>+18 pour Lv.3</span>
        </div>

        {/* Ma main */}
        <SectionLabel action={<span style={{ color: ACCENT_VIOLET, fontSize: 10 }}>+ AJOUTER</span>}>
          MA MAIN · {MY_SITES.length} CARTES
        </SectionLabel>
        <MyHand sites={MY_SITES} />

        {/* Suggestions IA */}
        <SectionLabel>SUGGESTIONS DE L&apos;IA</SectionLabel>
        {AI_SUGGESTIONS.map((s) => {
          const domain = s.target.split(" →")[0].trim();
          const mySite = MY_SITES.find((c) => c.domain === domain);
          const targetCard = s.kind === "donate" ? NAV_DECK.find((c) => s.target.includes(c.domain)) : undefined;
          return <AISuggestionTCG key={s.id} s={s} mySite={mySite} targetCard={targetCard} />;
        })}

        {/* Activité */}
        <SectionLabel>ACTIVITÉ RÉCENTE</SectionLabel>
        {RECENT_ACTIVITY.map((a, i) => (
          <ActivityRow key={i} a={a} />
        ))}

        <div style={{ height: 16 }} />
      </Body>
      <BottomNav />
    </>
  );
}
