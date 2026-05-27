"use client";

import { useState, type CSSProperties } from "react";
import { ACCENT_GREEN, ACCENT_VIOLET } from "./constants";
import { getTopics, getMyDeck, getPartners } from "@/lib/data";
import { Body, CreditsBadge, SectionLabel, StatusBar } from "./primitives";
import { BottomNav } from "./BottomNav";
import { MiniCardTCG, PlayLink } from "./MiniCard";
import { icons } from "./icons";

const MY_SITES = getMyDeck();
const PARTNERS_SUGGESTED = getPartners();
const AI_TOPICS = getTopics();

const TOTAL = 4;

export function DonnerFlow() {
  const [step, setStep] = useState(1);
  const next = () => setStep((s) => (s >= TOTAL ? 1 : s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  return (
    <>
      <StatusBar />
      <Body>
        <StepHeader step={step} title={STEP_META[step].title} subtitle={STEP_META[step].subtitle} onBack={step > 1 ? prev : undefined} />
        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && <Step3 />}
        {step === 4 && <Step4 />}
        <StepCTA
          primary={STEP_META[step].cta}
          onClick={next}
          accent={step === 4 ? ACCENT_GREEN : ACCENT_VIOLET}
          primaryColor={step === 4 ? "#0f172a" : "#fff"}
        />
      </Body>
      <BottomNav />
    </>
  );
}

const STEP_META: Record<number, { title: string; subtitle: string; cta: string }> = {
  1: { title: "Quelle carte voulez-vous jouer ?", subtitle: "L’IA évalue le potentiel de chaque carte pour générer des crédits.", cta: "Choisir cette carte" },
  2: { title: "Sur quel territoire ?", subtitle: "L’IA a identifié 3 sites où votre carte serait pertinente.", cta: "Cibler ce territoire" },
  3: { title: "L’IA propose un article", subtitle: "Sujet + texte + ancre. Vous éditez avant publication.", cta: "Valider et continuer" },
  4: { title: "Jouez votre carte", subtitle: "Publiez l’article. La capture démarre dès détection du lien.", cta: "J’ai publié l’article" },
};

// ── Étape 1 — choisir une carte de sa main ──
function Step1() {
  const fits = [0.82, 0.61, 0.74];
  const expected = [12, 5, 8];
  return (
    <div style={{ marginTop: 6 }}>
      {MY_SITES.map((site, i) => {
        const recommended = i === 0;
        return (
          <div
            key={site.id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "stretch",
              padding: 10,
              marginBottom: 10,
              background: recommended ? "rgba(57,255,20,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${recommended ? "rgba(57,255,20,0.45)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 10,
              position: "relative",
            }}
          >
            {recommended && <Ribbon>RECOMMANDÉ</Ribbon>}
            <MiniCardTCG card={site} scale={0.26} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hub-fg)" }}>{site.domain}</div>
                <div style={{ fontSize: 10, color: "var(--hub-fg-soft)", marginTop: 2 }}>
                  {site.thematique} · LV.{site.level}
                </div>
                <div style={{ fontSize: 11, color: "var(--hub-fg-soft)", marginTop: 8, lineHeight: 1.35 }}>{site.summary}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <FitGauge value={fits[i]} />
                <CreditsBadge value={`+${expected[i]}`} tone="gain" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Étape 2 — choisir un territoire ──
function Step2() {
  const myCard = MY_SITES[0];
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          marginTop: 4,
          marginBottom: 14,
          background: "rgba(138,43,226,0.10)",
          border: "1px solid rgba(138,43,226,0.4)",
          borderRadius: 8,
        }}
      >
        <MiniCardTCG card={myCard} scale={0.17} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 7, color: ACCENT_VIOLET, letterSpacing: 1.5 }}>CARTE EN MAIN</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hub-fg)", marginTop: 2 }}>{myCard.domain}</div>
        </div>
      </div>

      {PARTNERS_SUGGESTED.map((p, i) => (
        <div
          key={p.id}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "stretch",
            padding: 10,
            marginBottom: 10,
            background: i === 0 ? "rgba(57,255,20,0.06)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${i === 0 ? "rgba(57,255,20,0.45)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 10,
            position: "relative",
          }}
        >
          {i === 0 && <Ribbon>MEILLEUR FIT</Ribbon>}
          <MiniCardTCG card={p.card} scale={0.26} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hub-fg)" }}>{p.card.domain}</div>
              <div style={{ fontSize: 10, color: "var(--hub-fg-soft)", marginTop: 2 }}>
                {p.card.thematique} · LV.{p.card.level} · {p.card.owner}
              </div>
              <div style={{ fontSize: 11, color: "var(--hub-fg-soft)", marginTop: 8, lineHeight: 1.35, fontStyle: "italic" }}>« {p.reason} »</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <FitGauge value={p.relevance} />
              <CreditsBadge value={`+${p.credits}`} tone="gain" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Étape 3 — l’IA propose l’article + ancre ──
function Step3() {
  const myCard = MY_SITES[0];
  const target = PARTNERS_SUGGESTED[0].card;
  const topic = AI_TOPICS[0];
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 6,
          marginBottom: 14,
          padding: "10px 6px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
        }}
      >
        <MiniCardTCG card={myCard} scale={0.2} />
        <PlayLink label="JOUE" />
        <MiniCardTCG card={target} scale={0.2} />
      </div>

      <SectionLabel action={<button style={MINI_BTN}>3 alternatives</button>}>SUJET PROPOSÉ</SectionLabel>
      <div style={{ padding: 12, background: "rgba(138,43,226,0.08)", border: "1px solid rgba(138,43,226,0.4)", borderRadius: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--hub-fg)", lineHeight: 1.3 }}>{topic.title}</div>
        <div style={{ fontSize: 11, color: "var(--hub-fg-soft)", marginTop: 6 }}>Angle : {topic.angle}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <FitGauge value={topic.fit} />
          <CreditsBadge value={`+${topic.credits}`} tone="gain" />
        </div>
      </div>

      <SectionLabel
        action={
          <span style={{ color: ACCENT_VIOLET, fontSize: 10, display: "inline-flex", gap: 4, alignItems: "center" }}>
            {icons.edit(12)} ÉDITER
          </span>
        }
      >
        PARAGRAPHE GÉNÉRÉ · ANCRE EN VIOLET
      </SectionLabel>
      <div style={{ padding: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, fontSize: 12, lineHeight: 1.55, color: "var(--hub-fg)" }}>
        Parmi les outils SEO les plus pointus en 2026, on retrouve désormais des solutions hybrides combinant analyse sémantique LLM et indexation temps réel. Le{" "}
        <span style={{ color: ACCENT_VIOLET, background: "rgba(138,43,226,0.18)", padding: "1px 4px", borderRadius: 3, fontWeight: 600, border: "1px dashed rgba(138,43,226,0.55)" }}>
          guide complet du SEO
        </span>{" "}
        publié récemment sur <code style={INLINE_CODE}>{target.domain}</code> détaille les huit grandes catégories qu’un éditeur indépendant doit surveiller — un point de départ utile.
      </div>

      <div
        style={{
          marginTop: 10,
          padding: "8px 10px",
          background: "rgba(255,255,255,0.03)",
          border: "1px dashed rgba(255,255,255,0.18)",
          borderRadius: 6,
          fontSize: 11,
          color: "var(--hub-fg-soft)",
          lineHeight: 1.4,
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <span style={{ color: ACCENT_VIOLET }}>{icons.sparkle(13)}</span>
        <span>
          <strong>L’IA suggère, vous validez.</strong> Aucune publication automatique. Vous restez l’éditeur.
        </span>
      </div>
    </>
  );
}

// ── Étape 4 — jouer la carte + capture ──
function Step4() {
  const myCard = MY_SITES[0];
  return (
    <>
      <div
        style={{
          position: "relative",
          marginTop: 6,
          height: 240,
          background:
            "radial-gradient(80% 60% at 50% 70%, rgba(57,255,20,0.20) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
          border: "1px solid rgba(57,255,20,0.25)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${20 + i * 11}%`,
              top: `${50 + (i % 2 ? -10 : 10)}%`,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: ACCENT_GREEN,
              boxShadow: `0 0 8px ${ACCENT_GREEN}`,
              opacity: 0.6 + (i % 3) * 0.15,
              animation: `floatUp${i % 3} 2s ease-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
        <div style={{ transform: "translateY(-4px) rotate(-3deg)", filter: `drop-shadow(0 14px 24px ${ACCENT_GREEN}66)` }}>
          <MiniCardTCG card={myCard} scale={0.38} />
        </div>
      </div>

      <SectionLabel>MARCHE À SUIVRE</SectionLabel>
      <ol style={{ margin: 0, padding: "0 0 0 20px", fontSize: 12, color: "var(--hub-fg)", lineHeight: 1.55 }}>
        <li>
          <strong>Copiez le texte</strong> validé à l’étape précédente.
        </li>
        <li>
          <strong>Publiez-le</strong> sur <code style={INLINE_CODE}>{myCard.domain}/blog/</code>.
        </li>
        <li>
          <strong>Confirmez ci-dessous</strong> ; nous capturons la page sous 24h.
        </li>
      </ol>

      <div
        style={{
          marginTop: 14,
          padding: 12,
          background: "rgba(57,255,20,0.08)",
          border: "1px solid rgba(57,255,20,0.45)",
          borderRadius: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 7, color: ACCENT_GREEN, letterSpacing: 1.5 }}>RÉCOMPENSE À DÉBLOQUER</div>
          <div style={{ fontSize: 12, color: "var(--hub-fg)", marginTop: 4 }}>Crédités après vérification du lien</div>
        </div>
        <CreditsBadge value="+12" size="lg" tone="gain" />
      </div>
    </>
  );
}

// ── Helpers ──
function StepHeader({ step, title, subtitle, onBack }: { step: number; title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <div style={{ padding: "14px 0 6px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{ background: "transparent", border: "none", color: ACCENT_VIOLET, cursor: "pointer", fontFamily: "var(--font-pixel-display)", fontSize: 8, letterSpacing: 1, padding: 0 }}
          >
            ← RETOUR
          </button>
        )}
        <div style={{ display: "inline-flex", gap: 6, alignItems: "center", fontFamily: "var(--font-pixel-display)", fontSize: 8, color: ACCENT_VIOLET, letterSpacing: 2 }}>
          <span>ÉTAPE {step} / {TOTAL}</span>
          <span style={{ display: "inline-flex", gap: 3 }}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 14,
                  height: 3,
                  background: i < step ? ACCENT_VIOLET : "rgba(255,255,255,0.12)",
                  borderRadius: 2,
                  boxShadow: i < step ? `0 0 5px ${ACCENT_VIOLET}` : "none",
                }}
              />
            ))}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--hub-fg)", letterSpacing: -0.2, lineHeight: 1.2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: "var(--hub-fg-soft)", marginTop: 5, lineHeight: 1.4 }}>{subtitle}</div>}
    </div>
  );
}

function StepCTA({ primary, onClick, accent, primaryColor }: { primary: string; onClick: () => void; accent: string; primaryColor: string }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
      <button
        onClick={onClick}
        style={{
          flex: 1,
          height: 48,
          background: accent,
          color: primaryColor,
          fontFamily: "var(--font-hub)",
          fontWeight: 700,
          fontSize: 14,
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          boxShadow: `0 0 18px ${accent}66`,
        }}
      >
        {primary}
      </button>
    </div>
  );
}

function FitGauge({ value }: { value: number }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 7, color: "var(--hub-fg-soft)", letterSpacing: 1, marginBottom: 3 }}>
        FIT IA · {Math.round(value * 100)}%
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${value * 100}%`, height: "100%", background: ACCENT_GREEN, boxShadow: `0 0 5px ${ACCENT_GREEN}` }} />
      </div>
    </div>
  );
}

function Ribbon({ children }: { children: string }) {
  return (
    <span
      style={{
        position: "absolute",
        top: -8,
        left: 10,
        padding: "2px 8px",
        background: ACCENT_GREEN,
        color: "#0f172a",
        fontFamily: "var(--font-pixel-display)",
        fontSize: 7,
        letterSpacing: 1.5,
        borderRadius: 3,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

const MINI_BTN: CSSProperties = {
  padding: "2px 8px",
  background: "transparent",
  color: ACCENT_VIOLET,
  border: `1px solid ${ACCENT_VIOLET}55`,
  borderRadius: 4,
  fontFamily: "var(--font-hub)",
  fontSize: 9,
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: 0.3,
};

const INLINE_CODE: CSSProperties = {
  fontFamily: "var(--font-pixel-body)",
  background: "rgba(255,255,255,0.08)",
  padding: "1px 5px",
  borderRadius: 3,
  fontSize: 13,
  color: "#fff",
};
