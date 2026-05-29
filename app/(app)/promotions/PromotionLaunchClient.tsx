"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ACCENT_GREEN, ACCENT_VIOLET, LEVEL_LABEL } from "@/app/components/hub/constants";
import { Body, CreditsBadge, ScreenHeader, SectionLabel, StatusBar } from "@/app/components/hub/primitives";
import { BottomNav } from "@/app/components/hub/BottomNav";
import {
  PROMO_ALLOWED_DURATIONS,
  computePromoCost,
  type PromoDuration,
} from "@/lib/promotions/policy";
import type { PromotionView } from "@/lib/promotions/types";
import { launchPromotionAction } from "./promotion-actions";

interface PromoSite {
  siteId: string;
  domain: string;
  level: number;
  element: string;
}

const DURATION_LABEL: Record<number, string> = {
  1: "1 jour",
  3: "3 jours",
  7: "1 semaine",
  14: "2 semaines",
  30: "1 mois",
};

/** Carte de jeu — palier de rareté pour l'option « niveau ciblé ». */
const LEVEL_OPTIONS = [0, 1, 2, 3, 4] as const;

export function PromotionLaunchClient({
  balance,
  sites,
  myPromotions,
}: {
  balance: number;
  sites: PromoSite[];
  myPromotions: PromotionView[];
}) {
  const hasSites = sites.length > 0;
  const [siteId, setSiteId] = useState<string>(sites[0]?.siteId ?? "");
  const [durationDays, setDurationDays] = useState<PromoDuration>(7);
  /** 0 = tous niveaux (aucun ciblage). */
  const [targetLevel, setTargetLevel] = useState<number>(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cost = useMemo(
    () =>
      computePromoCost({
        targetLevel: targetLevel === 0 ? undefined : targetLevel,
        durationDays,
      }),
    [targetLevel, durationDays],
  );

  const insufficient = balance < cost;
  const canLaunch = hasSites && !!siteId && !insufficient && !pending;

  function handleLaunch() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await launchPromotionAction({
        siteId,
        durationDays,
        targetLevel: targetLevel === 0 ? undefined : targetLevel,
      });
      if (res.ok) {
        setSuccess(`Promotion lancée pour ${res.promotion.siteDomain ?? "ton site"} (${res.promotion.creditsSpent} ◇).`);
      } else {
        setError(res.error);
      }
    });
  }

  // Solde courant affiché optimiste après un succès (le refresh server-side
  // recharge la valeur exacte via revalidatePath).
  const displayedBalance = success ? Math.max(0, balance - cost) : balance;

  return (
    <>
      <StatusBar />
      <Body>
        <ScreenHeader
          title="Promouvoir un site"
          subtitle="Dépense des crédits pour remonter dans les suggestions de partenaires."
          right={<CreditsBadge value={displayedBalance} size="lg" />}
        />

        {!hasSites ? (
          <EmptyState />
        ) : (
          <>
            {/* 1) Site à promouvoir */}
            <SectionLabel>SITE À PROMOUVOIR</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sites.map((s) => {
                const selected = s.siteId === siteId;
                return (
                  <button
                    key={s.siteId}
                    type="button"
                    onClick={() => setSiteId(s.siteId)}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${selected ? ACCENT_VIOLET : "rgba(255,255,255,0.12)"}`,
                      background: selected ? "rgba(138,43,226,0.12)" : "rgba(255,255,255,0.03)",
                      color: "var(--hub-fg)",
                      cursor: "pointer",
                      fontFamily: "var(--font-hub)",
                      fontSize: 13,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{s.domain}</span>
                    <span style={{ fontSize: 10, color: "var(--hub-fg-soft)" }}>
                      {LEVEL_LABEL[s.level] ?? `Lv.${s.level}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 2) Audience ciblée (niveau) */}
            <SectionLabel>AUDIENCE CIBLÉE (NIVEAU)</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {LEVEL_OPTIONS.map((lvl) => {
                const selected = lvl === targetLevel;
                return (
                  <Chip key={lvl} selected={selected} onClick={() => setTargetLevel(lvl)}>
                    {lvl === 0 ? "Tous" : (LEVEL_LABEL[lvl] ?? `Lv.${lvl}`)}
                  </Chip>
                );
              })}
            </div>

            {/* 3) Durée */}
            <SectionLabel>DURÉE</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PROMO_ALLOWED_DURATIONS.map((d) => {
                const selected = d === durationDays;
                return (
                  <Chip key={d} selected={selected} onClick={() => setDurationDays(d)}>
                    {DURATION_LABEL[d] ?? `${d} j`}
                  </Chip>
                );
              })}
            </div>

            {/* 4) Aperçu coût + confirmation */}
            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${insufficient ? "rgba(255,80,80,0.5)" : "rgba(57,255,20,0.35)"}`,
                background: insufficient ? "rgba(255,80,80,0.06)" : "rgba(57,255,20,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--hub-fg-soft)" }}>Coût de la promotion</span>
                <CreditsBadge value={cost} tone="cost" />
              </div>

              {insufficient ? (
                <p style={{ fontSize: 12, color: "#ff9a9a", lineHeight: 1.45, margin: "10px 0 0" }}>
                  Solde insuffisant : il te manque {cost - balance} ◇.{" "}
                  <Link href="/donner" style={{ color: ACCENT_VIOLET, fontWeight: 700, textDecoration: "none" }}>
                    Donne un lien
                  </Link>{" "}
                  pour gagner des crédits.
                </p>
              ) : (
                <p style={{ fontSize: 11, color: "var(--hub-fg-soft)", lineHeight: 1.45, margin: "8px 0 0" }}>
                  Ton site remontera dans les suggestions des partenaires correspondants pendant{" "}
                  {DURATION_LABEL[durationDays] ?? `${durationDays} jours`}.
                </p>
              )}

              <button
                type="button"
                onClick={handleLaunch}
                disabled={!canLaunch}
                style={{
                  marginTop: 12,
                  width: "100%",
                  minHeight: 48,
                  borderRadius: 10,
                  border: "none",
                  cursor: canLaunch ? "pointer" : "not-allowed",
                  opacity: canLaunch ? 1 : 0.5,
                  background: ACCENT_VIOLET,
                  color: "#fff",
                  fontFamily: "var(--font-hub)",
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: canLaunch ? `0 0 18px ${ACCENT_VIOLET}66` : "none",
                }}
              >
                {pending ? "Lancement…" : `Lancer la promotion · ${cost} ◇`}
              </button>

              {error && (
                <p style={{ fontSize: 12, color: "#ff9a9a", margin: "10px 0 0" }}>{error}</p>
              )}
              {success && (
                <p style={{ fontSize: 12, color: ACCENT_GREEN, margin: "10px 0 0" }}>{success}</p>
              )}
            </div>
          </>
        )}

        {/* Historique des promotions */}
        {myPromotions.length > 0 && (
          <>
            <SectionLabel>MES PROMOTIONS</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myPromotions.map((p) => (
                <PromotionRow key={p.id} p={p} />
              ))}
            </div>
          </>
        )}

        <div style={{ height: 16 }} />
      </Body>
      <BottomNav />
    </>
  );
}

function Chip({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        border: `1px solid ${selected ? ACCENT_VIOLET : "rgba(255,255,255,0.14)"}`,
        background: selected ? "rgba(138,43,226,0.16)" : "rgba(255,255,255,0.03)",
        color: selected ? "#fff" : "var(--hub-fg-soft)",
        fontFamily: "var(--font-hub)",
        fontSize: 12,
        fontWeight: selected ? 700 : 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function PromotionRow({ p }: { p: PromotionView }) {
  const statusLabel = p.isEffectivelyActive
    ? "Active"
    : p.status === "CANCELLED"
      ? "Annulée"
      : "Terminée";
  const statusColor = p.isEffectivelyActive ? ACCENT_GREEN : "var(--hub-fg-soft)";
  const expires = p.expiresAt ? new Date(p.expiresAt).toLocaleDateString("fr-FR") : "—";
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.03)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "var(--font-hub)",
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: "var(--hub-fg)" }}>{p.siteDomain ?? "Site"}</div>
        <div style={{ fontSize: 10, color: "var(--hub-fg-soft)", marginTop: 3 }}>
          {p.creditsSpent} ◇ ·{" "}
          {p.targetLevel ? (LEVEL_LABEL[p.targetLevel] ?? `Lv.${p.targetLevel}`) : "Tous niveaux"} · expire {expires}
        </div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        marginTop: 16,
        padding: "22px 18px",
        borderRadius: 12,
        border: "1px solid rgba(138,43,226,0.4)",
        background: "rgba(138,43,226,0.08)",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 13, color: "var(--hub-fg)", lineHeight: 1.5, margin: 0 }}>
        Tu n&apos;as pas encore de site à promouvoir.
      </p>
      <Link
        href="/capturer"
        style={{
          marginTop: 12,
          display: "inline-flex",
          alignItems: "center",
          minHeight: 44,
          padding: "0 18px",
          borderRadius: 10,
          background: ACCENT_VIOLET,
          color: "#fff",
          fontFamily: "var(--font-hub)",
          fontWeight: 700,
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        Capturer mon premier site
      </Link>
    </div>
  );
}
