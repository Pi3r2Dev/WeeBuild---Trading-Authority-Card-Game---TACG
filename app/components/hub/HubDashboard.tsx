import Link from "next/link";
import { ACCENT_VIOLET } from "./constants";
import { getSuggestions, getMe, getMyDeck, getNavDeck, getRecentActivity } from "@/lib/data";
import { getMyDeckRescanBadges } from "@/lib/data/card-detail";
import { requireSession } from "@/lib/auth-session";
import { Body, CreditsBadge, ScreenHeader, SectionLabel, StatusBar } from "./primitives";
import { TacgAcronymBanner } from "./TacgAcronymBanner";
import { BottomNav } from "./BottomNav";
import { MyHand } from "./MiniCard";
import { AISuggestionTCG, ActivityRow } from "./HubWidgets";
import { GAME_LOOP_ENABLED } from "../app/flags";
import { icons } from "./icons";

/**
 * Écran d'accueil après login.
 *
 * Peau honnête P1.5 (cf. plan §5) : derrière `GAME_LOOP_ENABLED` (false), on
 * MASQUE l'économie de jeu non construite (P3) — pastille crédits, bloc
 * « Donneur · Lv.X » + progression, et la section « SUGGESTIONS DE L'IA »
 * (fausses personnes). La main (cartes réelles seedées/capturées) et l'activité
 * réelle restent visibles. Compte 0-carte → onboarding « Déclare ton 1er site ».
 */
export async function HubDashboard() {
  const session = await requireSession();
  const userId = session.user.id;
  const [ME, MY_SITES, NAV_DECK, AI_SUGGESTIONS, RECENT_ACTIVITY, RESCAN_BADGES] = await Promise.all([
    getMe(userId),
    getMyDeck(userId),
    getNavDeck(),
    GAME_LOOP_ENABLED ? getSuggestions(userId) : Promise.resolve([]),
    GAME_LOOP_ENABLED ? getRecentActivity(userId) : Promise.resolve([]),
    getMyDeckRescanBadges(userId, session.user.email),
  ]);
  const firstName = ME.name.split(" ")[0];
  const hasCards = MY_SITES.length > 0;

  return (
    <>
      <StatusBar />
      <Body>
        <TacgAcronymBanner />
        <ScreenHeader
          title={`Salut, ${firstName}`}
          subtitle={
            GAME_LOOP_ENABLED
              ? AI_SUGGESTIONS.length > 0
                ? `${AI_SUGGESTIONS.length} suggestion${AI_SUGGESTIONS.length > 1 ? "s" : ""} de l'IA`
                : "Lancez un matching pour des suggestions éditoriales"
              : hasCards
                ? "Votre collection de cartes d'autorité"
                : "Déclarez votre premier site pour commencer"
          }
          right={GAME_LOOP_ENABLED ? <CreditsBadge value={ME.credits} size="lg" /> : undefined}
        />

        {/* Progression personnelle (économie de crédits) — masquée tant que P3
            non construite (sinon « Donneur Lv.2 » serait malhonnête). */}
        {GAME_LOOP_ENABLED && (
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
        )}

        {hasCards ? (
          <>
            {/* Ma main */}
            <SectionLabel
              action={
                <Link href="/capturer" style={{ color: ACCENT_VIOLET, fontSize: 10, textDecoration: "none", fontWeight: 700 }}>
                  + AJOUTER
                </Link>
              }
            >
              MA MAIN · {MY_SITES.length} CARTES
            </SectionLabel>
            <MyHand sites={MY_SITES} rescanBadges={RESCAN_BADGES} />
          </>
        ) : (
          <FirstRunOnboarding />
        )}

        {/* Suggestions IA — fausses personnes (P3) → masquées. */}
        {GAME_LOOP_ENABLED && (
          <>
            <SectionLabel>SUGGESTIONS DE L&apos;IA</SectionLabel>
            {AI_SUGGESTIONS.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--hub-fg-soft)", lineHeight: 1.45, margin: "4px 0 0" }}>
                Aucune suggestion pour l&apos;instant. Capturez un site puis lancez le matching depuis{" "}
                <Link href="/capturer" style={{ color: ACCENT_VIOLET, fontWeight: 700, textDecoration: "none" }}>
                  Capturer
                </Link>{" "}
                ou le flux{" "}
                <Link href="/donner" style={{ color: ACCENT_VIOLET, fontWeight: 700, textDecoration: "none" }}>
                  Donner
                </Link>
                .
              </p>
            ) : (
              AI_SUGGESTIONS.map((s) => {
                const domain = s.target.split(" →")[0].trim();
                const mySite = MY_SITES.find((c) => c.domain === domain);
                const targetDomain = s.target.split("→")[1]?.trim();
                const targetCard = targetDomain ? NAV_DECK.find((c) => c.domain === targetDomain) : undefined;
                return <AISuggestionTCG key={s.id} s={s} mySite={mySite} targetCard={targetCard} />;
              })
            )}
          </>
        )}

        {GAME_LOOP_ENABLED && RECENT_ACTIVITY.length > 0 && (
          <>
            <SectionLabel>ACTIVITÉ RÉCENTE</SectionLabel>
            {RECENT_ACTIVITY.map((a, i) => (
              <ActivityRow key={i} a={a} />
            ))}
          </>
        )}

        <div style={{ height: 16 }} />
      </Body>
      <BottomNav />
    </>
  );
}

/** Premier run (0 carte) : le vrai *aha moment* → capturer son 1er site. */
function FirstRunOnboarding() {
  return (
    <div
      style={{
        marginTop: 16,
        padding: "26px 20px",
        background:
          "radial-gradient(120% 100% at 50% 0%, rgba(138,43,226,0.16) 0%, rgba(255,255,255,0.02) 60%)",
        border: "1px solid rgba(138,43,226,0.4)",
        borderRadius: 14,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          background: "rgba(138,43,226,0.18)",
          border: "1px solid rgba(138,43,226,0.5)",
          color: ACCENT_VIOLET,
          boxShadow: `0 0 22px ${ACCENT_VIOLET}55`,
        }}
      >
        {icons.camera(26)}
      </div>
      <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 10, letterSpacing: 1.5, color: "var(--hub-fg-soft)" }}>
        VOTRE MAIN EST VIDE
      </div>
      <h2 style={{ fontFamily: "var(--font-hub)", fontSize: 19, fontWeight: 800, margin: 0, color: "var(--hub-fg)", lineHeight: 1.25 }}>
        Déclarez votre premier site
      </h2>
      <p style={{ fontSize: 13, color: "var(--hub-fg-soft)", lineHeight: 1.5, margin: 0, maxWidth: 340 }}>
        On capture la page, on en mesure l&apos;autorité, et votre site devient une carte
        dont la rareté (Game Boy → Holo) reflète sa puissance SEO.
      </p>
      <Link
        href="/capturer"
        style={{
          marginTop: 4,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          minHeight: 48,
          padding: "0 22px",
          background: ACCENT_VIOLET,
          color: "#fff",
          fontFamily: "var(--font-hub)",
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
          borderRadius: 10,
          boxShadow: `0 0 20px ${ACCENT_VIOLET}66`,
        }}
      >
        {icons.camera(16)} Capturer mon site
      </Link>
    </div>
  );
}
