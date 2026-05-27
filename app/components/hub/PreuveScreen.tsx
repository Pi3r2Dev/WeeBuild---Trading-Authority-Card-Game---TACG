"use client";

import { useState } from "react";
import { ACCENT_GREEN, ACCENT_VIOLET } from "./constants";
import type { CardData, NavCard, Proof, ProofStatus } from "@/lib/domain";
import { Body, ScreenHeader, SectionLabel, StatusBar, CreditsBadge } from "./primitives";
import { BottomNav } from "./BottomNav";
import { MiniCardTCG, PlayLink } from "./MiniCard";
import { icons } from "./icons";

const STATUS_META: Record<ProofStatus, { color: string; label: string; icon: (s?: number) => React.ReactElement }> = {
  verified: { color: ACCENT_GREEN, label: "Vérifié", icon: icons.check },
  capturing: { color: "#fbbf24", label: "Capture en cours", icon: icons.clock },
  pending: { color: "var(--hub-fg-soft)", label: "En attente", icon: icons.clock },
  broken: { color: "#ef4444", label: "Lien rompu", icon: icons.camera },
};

/** Sceaux de preuve — composant CLIENT (détail/liste), données en props. */
export function PreuveScreen({ mySites, navDeck, proofs }: { mySites: CardData[]; navDeck: NavCard[]; proofs: Proof[] }) {
  const MY_SITES = mySites;
  const NAV_DECK = navDeck;
  const PROOF_LIST = proofs;
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? PROOF_LIST.find((p) => p.id === detailId) : null;

  return (
    <>
      <StatusBar />
      <Body>
        {detail ? (
          <Detail proof={detail} onBack={() => setDetailId(null)} MY_SITES={MY_SITES} NAV_DECK={NAV_DECK} />
        ) : (
          <List onOpen={setDetailId} NAV_DECK={NAV_DECK} PROOF_LIST={PROOF_LIST} />
        )}
      </Body>
      <BottomNav />
    </>
  );
}

function List({ onOpen, NAV_DECK, PROOF_LIST }: { onOpen: (id: string) => void; NAV_DECK: NavCard[]; PROOF_LIST: Proof[] }) {
  const verified = PROOF_LIST.filter((p) => p.status === "verified").length;
  return (
    <>
      <ScreenHeader title="Sceaux de preuve" subtitle={`${verified} liens vérifiés sur ${PROOF_LIST.length}`} />

      <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 14 }}>
        <SealStat label="Vérifiés" value="3" color={ACCENT_GREEN} />
        <SealStat label="En cours" value="1" color="#fbbf24" />
        <SealStat label="Rompu" value="1" color="#ef4444" />
      </div>

      {PROOF_LIST.map((p) => {
        const targetCard = NAV_DECK.find((c) => c.id === p.target);
        if (!targetCard) return null;
        const meta = STATUS_META[p.status];
        return (
          <div
            key={p.id}
            onClick={() => onOpen(p.id)}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "stretch",
              padding: 10,
              marginBottom: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            <MiniCardTCG card={targetCard} scale={0.18} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hub-fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{targetCard.domain}</div>
                <div style={{ fontSize: 10, color: "var(--hub-fg-soft)", fontFamily: "var(--font-pixel-body)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  /{p.link.split("/").slice(1).join("/")}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", background: `${meta.color}1c`, border: `1px solid ${meta.color}66`, color: meta.color, fontFamily: "var(--font-pixel-display)", fontSize: 7, letterSpacing: 1, borderRadius: 4 }}>
                  {meta.icon(10)} {meta.label.toUpperCase()}
                </span>
                <span style={{ fontSize: 10, color: "var(--hub-fg-soft)" }}>{p.date}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ height: 16 }} />
    </>
  );
}

function Detail({ proof, onBack, MY_SITES, NAV_DECK }: { proof: Proof; onBack: () => void; MY_SITES: CardData[]; NAV_DECK: NavCard[] }) {
  const myCard = MY_SITES[0];
  const targetCard = NAV_DECK.find((c) => c.id === proof.target);
  if (!targetCard) return null;

  return (
    <>
      <div style={{ paddingTop: 14 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-pixel-display)", fontSize: 8, color: "var(--hub-fg-soft)", letterSpacing: 2, padding: 0 }}>
          ← TOUS LES SCEAUX
        </button>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--hub-fg)", marginTop: 8, letterSpacing: -0.3 }}>Sceau · {targetCard.domain}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, marginTop: 14, marginBottom: 16, background: "rgba(57,255,20,0.06)", border: "1px solid rgba(57,255,20,0.4)", borderRadius: 10 }}>
        <MiniCardTCG card={myCard} scale={0.22} />
        <PlayLink label="JOUÉ" />
        <MiniCardTCG card={targetCard} scale={0.22} />
      </div>

      <div style={{ padding: "10px 12px", background: `${ACCENT_GREEN}10`, border: `1px solid ${ACCENT_GREEN}66`, borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 32, height: 32, background: ACCENT_GREEN, color: "#0f172a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 12px ${ACCENT_GREEN}80` }}>
          {icons.check(18)}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 7, color: ACCENT_GREEN, letterSpacing: 1.5 }}>SCEAU ACTIF</div>
          <div style={{ fontSize: 13, color: "var(--hub-fg)", fontWeight: 600, marginTop: 3 }}>Lien vérifié il y a 4 h</div>
        </div>
        <CreditsBadge value={`+${proof.credits}`} tone="gain" />
      </div>

      <SectionLabel>CAPTURE DE LA PAGE</SectionLabel>
      <div style={{ position: "relative", padding: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", background: "rgba(255,255,255,0.04)", borderRadius: 4, marginBottom: 6, fontFamily: "var(--font-pixel-body)", fontSize: 11, color: "var(--hub-fg-soft)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24" }} />
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT_GREEN }} />
          <span style={{ marginLeft: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{proof.link}</span>
        </div>
        <div style={{ background: "#f4f4f5", color: "#0f172a", padding: 12, borderRadius: 4, fontFamily: "var(--font-hub)", fontSize: 10, lineHeight: 1.5 }}>
          <div style={{ height: 8, width: "60%", background: "#0f172a", marginBottom: 8 }} />
          <div style={{ height: 4, width: "90%", background: "#94a3b8", marginBottom: 4 }} />
          <div style={{ height: 4, width: "80%", background: "#94a3b8", marginBottom: 4 }} />
          <div style={{ height: 4, width: "70%", background: "#94a3b8", marginBottom: 8 }} />
          <div style={{ fontSize: 9, lineHeight: 1.55, color: "#0f172a" }}>
            Pour aller plus loin, le{" "}
            <span style={{ background: "rgba(57,255,20,0.45)", outline: `2px solid ${ACCENT_GREEN}`, padding: "0 2px", borderRadius: 1, fontWeight: 700 }}>guide complet du SEO</span>{" "}
            d’Alex M. propose une grille d’évaluation très complète…
          </div>
          <div style={{ height: 4, width: "85%", background: "#94a3b8", marginTop: 8, marginBottom: 4 }} />
          <div style={{ height: 4, width: "60%", background: "#94a3b8" }} />
        </div>
        <div style={{ position: "absolute", top: 50, right: 14, display: "flex", alignItems: "center", gap: 4, padding: "3px 7px", background: ACCENT_GREEN, color: "#0f172a", fontFamily: "var(--font-pixel-display)", fontSize: 7, letterSpacing: 1, borderRadius: 3, fontWeight: 700, boxShadow: `0 0 8px ${ACCENT_GREEN}80` }}>
          {icons.check(9)} LIEN DÉTECTÉ
        </div>
      </div>

      <SectionLabel>HISTORIQUE</SectionLabel>
      <Timeline
        events={[
          { t: "il y a 5 j", label: "Article publié", done: true },
          { t: "il y a 5 j", label: "Première capture · lien détecté", done: true },
          { t: "il y a 4 h", label: "Re-vérification automatique · OK", done: true },
          { t: "dans 7 j", label: "Prochaine vérification programmée", done: false },
        ]}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button style={{ flex: 1, height: 42, background: ACCENT_VIOLET, color: "#fff", fontFamily: "var(--font-hub)", fontWeight: 700, fontSize: 13, border: "none", borderRadius: 6, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: `0 0 14px ${ACCENT_VIOLET}66` }}>
          {icons.camera(15)} Re-capturer
        </button>
        <button style={{ flex: 1, height: 42, background: "transparent", color: "var(--hub-fg)", border: "1px solid rgba(255,255,255,0.22)", fontFamily: "var(--font-hub)", fontWeight: 600, fontSize: 13, borderRadius: 6, cursor: "pointer" }}>
          Voir l’article
        </button>
      </div>
      <div style={{ height: 16 }} />
    </>
  );
}

function SealStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, padding: "8px 10px", background: `${color}10`, border: `1px solid ${color}55`, borderRadius: 8, display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontFamily: "var(--font-pixel-display)", fontSize: 7, color, letterSpacing: 1 }}>{label.toUpperCase()}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color: "var(--hub-fg)" }}>{value}</span>
    </div>
  );
}

function Timeline({ events }: { events: { t: string; label: string; done: boolean }[] }) {
  return (
    <div style={{ position: "relative", paddingLeft: 18 }}>
      <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 1, background: "rgba(255,255,255,0.12)" }} />
      {events.map((e, i) => (
        <div key={i} style={{ position: "relative", padding: "6px 0" }}>
          <span style={{ position: "absolute", left: -18, top: 8, width: 10, height: 10, borderRadius: "50%", background: e.done ? ACCENT_GREEN : "transparent", border: `2px solid ${e.done ? ACCENT_GREEN : "rgba(255,255,255,0.25)"}`, boxShadow: e.done ? `0 0 6px ${ACCENT_GREEN}` : "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: e.done ? "var(--hub-fg)" : "var(--hub-fg-soft)" }}>{e.label}</span>
            <span style={{ fontSize: 10, color: "var(--hub-fg-soft)" }}>{e.t}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
