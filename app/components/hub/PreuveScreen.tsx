"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { ACCENT_GREEN, ACCENT_VIOLET, LEVEL_LABEL } from "./constants";
import type { NavCard } from "@/lib/domain";
import type { LinkStatus, ProofView } from "@/lib/links/types";
import { Body, ScreenHeader, StatusBar, CreditsBadge } from "./primitives";
import { BottomNav } from "./BottomNav";
import { MiniCardTCG } from "./MiniCard";
import { icons } from "./icons";
import { GAME_LOOP_ENABLED, PROOFS_PIPELINE_ENABLED } from "../app/flags";
import { ComingSoon } from "./ComingSoon";
import { verifyLinkAction } from "@/app/(app)/preuves/proof-actions";

type StatusMeta = { color: string; label: string; icon: (s?: number) => ReactElement; verified: boolean };

const STATUS_META: Record<LinkStatus, StatusMeta> = {
  PUBLISHED: { color: "#fbbf24", label: "À vérifier", icon: icons.clock, verified: false },
  PROOF_PENDING: { color: "#fbbf24", label: "Lien introuvable", icon: icons.clock, verified: false },
  VERIFIED: { color: ACCENT_GREEN, label: "Vérifié", icon: icons.check, verified: true },
  BROKEN: { color: "#ef4444", label: "Lien rompu", icon: icons.camera, verified: false },
  HUMAN_VALIDATED: { color: "var(--hub-fg-soft)", label: "À publier", icon: icons.clock, verified: false },
  PROPOSED: { color: "var(--hub-fg-soft)", label: "Proposé", icon: icons.clock, verified: false },
  REJECTED: { color: "var(--hub-fg-soft)", label: "Rejeté", icon: icons.clock, verified: false },
};

/** Sceaux de preuve — composant CLIENT (liste + vérification), données en props. */
export function PreuveScreen({ navDeck, proofs }: { navDeck: NavCard[]; proofs: ProofView[] }) {
  // Preuves = pipeline B4 (LinkProof). GAME_LOOP seul n'active pas les sceaux.
  if (!GAME_LOOP_ENABLED || !PROOFS_PIPELINE_ENABLED) {
    return (
      <>
        <StatusBar />
        <Body>
          <ScreenHeader title="Sceaux de preuve" subtitle="La trace vérifiable de vos liens éditoriaux." />
          <ComingSoon
            title="Les sceaux de preuve arrivent bientôt"
            body="Dès qu’un lien éditorial est publié, la plateforme le détecte, le capture et scelle une preuve vérifiable."
          />
        </Body>
        <BottomNav />
      </>
    );
  }

  const verified = proofs.filter((p) => p.status === "VERIFIED").length;
  const pending = proofs.filter((p) => p.status === "PUBLISHED" || p.status === "PROOF_PENDING").length;
  const broken = proofs.filter((p) => p.status === "BROKEN").length;

  return (
    <>
      <StatusBar />
      <Body>
        <ScreenHeader title="Sceaux de preuve" subtitle={`${verified} lien${verified > 1 ? "s" : ""} vérifié${verified > 1 ? "s" : ""} sur ${proofs.length}`} />

        {proofs.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 14 }}>
              <SealStat label="Vérifiés" value={verified} color={ACCENT_GREEN} />
              <SealStat label="En attente" value={pending} color="#fbbf24" />
              <SealStat label="Rompus" value={broken} color="#ef4444" />
            </div>
            {proofs.map((p) => (
              <ProofRow key={p.linkId} proof={p} navDeck={navDeck} />
            ))}
            <div style={{ height: 16 }} />
          </>
        )}
      </Body>
      <BottomNav />
    </>
  );
}

function ProofRow({ proof, navDeck }: { proof: ProofView; navDeck: NavCard[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const meta = STATUS_META[proof.status] ?? STATUS_META.PUBLISHED;
  const targetCard = proof.beneficiaryCardId ? navDeck.find((c) => c.id === proof.beneficiaryCardId) : undefined;

  function run() {
    setMsg(null);
    start(async () => {
      const res = await verifyLinkAction(proof.linkId);
      if (!res.ok) return setMsg({ tone: "err", text: res.error });
      if (res.linkDetected && res.creditsDelta > 0) setMsg({ tone: "ok", text: `Lien vérifié — +${res.creditsDelta} crédits frappés.` });
      else if (res.linkDetected) setMsg({ tone: "ok", text: "Lien toujours en place." });
      else if (res.creditsDelta < 0) setMsg({ tone: "err", text: `Lien rompu — ${res.creditsDelta} crédits repris.` });
      else setMsg({ tone: "err", text: res.mentionDetected ? "Marque citée mais aucun lien détecté." : "Aucun lien détecté sur la page." });
      router.refresh();
    });
  }

  return (
    <div style={{ padding: 12, marginBottom: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
        {targetCard && <MiniCardTCG card={targetCard} scale={0.18} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hub-fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {proof.targetDomain}
            </div>
            <StatusBadge meta={meta} />
          </div>
          <div style={{ fontSize: 10, color: "var(--hub-fg-soft)", marginTop: 2 }}>
            {proof.targetOwner} · {LEVEL_LABEL[proof.targetLevel] ?? `LV.${proof.targetLevel}`}
          </div>
          <div style={{ fontSize: 11, color: "var(--hub-fg-soft)", marginTop: 8, lineHeight: 1.4, fontStyle: "italic" }}>« {proof.anchorText} »</div>
        </div>
      </div>

      {proof.proof && (
        <div style={{ marginTop: 10, fontSize: 10, color: "var(--hub-fg-soft)", lineHeight: 1.5 }}>
          {proof.proof.linkDetected ? (
            <>
              Lien détecté{proof.proof.rel ? ` · rel="${proof.proof.rel}"` : " · dofollow"}
              {proof.proof.positionInPage ? ` · position ${proof.proof.positionInPage}` : ""} · {proof.proof.checkCount} capture{proof.proof.checkCount > 1 ? "s" : ""}
            </>
          ) : (
            <>{proof.proof.mentionDetected ? "Marque citée sans lien" : "Aucun lien détecté"} · {proof.proof.checkCount} capture{proof.proof.checkCount > 1 ? "s" : ""}</>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 12 }}>
        <CreditsBadge value={meta.verified ? `+${proof.credits}` : `≈ +${proof.credits}`} tone={meta.verified ? "gain" : "cost"} />
        <button type="button" onClick={run} disabled={pending} style={verifyBtn(pending)}>
          {pending ? "Vérification…" : meta.verified || proof.proof ? "Re-vérifier" : "Vérifier le lien"}
        </button>
      </div>

      {msg && <p style={{ margin: "8px 0 0", fontSize: 11, color: msg.tone === "ok" ? "#86efac" : "#fca5a5", lineHeight: 1.45 }}>{msg.text}</p>}
    </div>
  );
}

function StatusBadge({ meta }: { meta: StatusMeta }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", background: `${meta.color}1c`, border: `1px solid ${meta.color}66`, color: meta.color, fontFamily: "var(--font-pixel-display)", fontSize: 7, letterSpacing: 1, borderRadius: 4, flexShrink: 0 }}>
      {meta.icon(10)} {meta.label.toUpperCase()}
    </span>
  );
}

function SealStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, padding: "8px 10px", background: `${color}10`, border: `1px solid ${color}55`, borderRadius: 8, display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontFamily: "var(--font-pixel-display)", fontSize: 7, color, letterSpacing: 1 }}>{label.toUpperCase()}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color: "var(--hub-fg)" }}>{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ marginTop: 16, padding: 18, background: "rgba(138,43,226,0.08)", border: "1px dashed rgba(138,43,226,0.45)", borderRadius: 12, textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--hub-fg)", marginBottom: 6 }}>Aucun lien à sceller pour l’instant</div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--hub-fg-soft)", lineHeight: 1.5 }}>
        Valide une suggestion puis publie ton article (flux Donner). Une fois l’URL renseignée, ton lien apparaîtra ici pour vérification.
      </p>
    </div>
  );
}

function verifyBtn(pending: boolean) {
  return {
    padding: "10px 16px",
    background: pending ? "rgba(138,43,226,0.25)" : ACCENT_VIOLET,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: pending ? "default" : "pointer",
    boxShadow: pending ? "none" : `0 0 14px ${ACCENT_VIOLET}55`,
  } as const;
}
