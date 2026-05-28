"use client";

import { useMemo, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ACCENT_GREEN, ACCENT_VIOLET, LEVEL_LABEL } from "@/app/components/hub/constants";
import { Body, ScreenHeader, SectionLabel, StatusBar } from "@/app/components/hub/primitives";
import { BottomNav } from "@/app/components/hub/BottomNav";
import { icons } from "@/app/components/hub/icons";
import { validateAnchor } from "@/lib/links/anchor-policy";
import { validateAndCreateLinkAction, publishLinkAction, rejectSuggestionAction } from "@/app/(app)/donner/link-actions";
import type { EditorialLinkView, SuggestionReviewView } from "@/lib/links/types";

const ANCHOR_TYPE_LABEL: Record<string, string> = {
  EXACT: "exact-match",
  PARTIAL: "ancre partielle",
  BRANDED: "marque",
  NAKED_URL: "URL nue",
  GENERIC: "générique",
  IMAGE: "image",
};

const LEVEL_COLOR: Record<string, string> = { ok: ACCENT_GREEN, warn: "#fbbf24", block: "#fca5a5" };

/**
 * Cœur B3 (client) — édition de l'ancre + URL, feedback anti-footprint live
 * (voix « assistant »), création puis publication du lien. L'ancre n'est JAMAIS
 * pré-remplie (la suggestion reste une référence) ; double validation : ce
 * `validateAnchor` côté client + la re-vérification serveur dans `write.ts`.
 */
export function LinkEditorClient({ review }: { review: SuggestionReviewView }) {
  const router = useRouter();
  const [link, setLink] = useState<EditorialLinkView | null>(review.existingLink);
  const [editedAnchor, setEditedAnchor] = useState("");
  const [targetUrl, setTargetUrl] = useState(review.defaultTargetUrl);
  const [publishedUrl, setPublishedUrl] = useState(review.existingLink?.publishedUrl ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const verdict = useMemo(
    () =>
      validateAnchor(editedAnchor, {
        suggestedAnchor: review.suggestedAnchor,
        beneficiaryDomain: review.target.domain,
        brandTokens: review.brandTokens,
      }),
    [editedAnchor, review.suggestedAnchor, review.target.domain, review.brandTokens],
  );

  const phase: "create" | "publish" | "published" =
    !link ? "create" : link.status === "HUMAN_VALIDATED" ? "publish" : "published";

  const anchorTouched = editedAnchor.trim().length > 0;
  const canValidate = anchorTouched && verdict.ok && targetUrl.trim().length > 0 && !pending;

  function onValidate() {
    setError(null);
    start(async () => {
      const res = await validateAndCreateLinkAction({ suggestionId: review.suggestionId, editedAnchor, targetUrl });
      if (!res.ok) return setError(res.error);
      setLink(res.link);
      setPublishedUrl(res.link.publishedUrl ?? "");
    });
  }

  function onPublish() {
    if (!link) return;
    setError(null);
    start(async () => {
      const res = await publishLinkAction({ linkId: link.id, publishedUrl, suggestionId: review.suggestionId });
      if (!res.ok) return setError(res.error);
      setLink(res.link);
    });
  }

  function onReject() {
    setError(null);
    start(async () => {
      const res = await rejectSuggestionAction(review.suggestionId);
      if (!res.ok) return setError(res.error);
      router.push("/donner/valider");
    });
  }

  return (
    <>
      <StatusBar />
      <Body>
        <BackLink />
        <ScreenHeader
          title="Valider la suggestion"
          subtitle={`${review.source.domain} → ${review.target.domain} · ${review.target.owner} · ${LEVEL_LABEL[review.target.level] ?? `LV.${review.target.level}`}`}
        />

        <AssistantNote phase={phase} verdict={anchorTouched ? verdict : null} />

        <SectionLabel>SUGGESTION IA · RÉFÉRENCE (NON MODIFIABLE)</SectionLabel>
        <div style={refBox}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hub-fg)", lineHeight: 1.3 }}>{review.articleTopic}</div>
          {review.rationale && <div style={{ fontSize: 11, color: "var(--hub-fg-soft)", marginTop: 6, lineHeight: 1.4 }}>{review.rationale}</div>}
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--hub-fg-soft)" }}>
            Ancre proposée :{" "}
            <span style={{ color: ACCENT_VIOLET, fontStyle: "italic" }}>« {review.suggestedAnchor} »</span>
          </div>
        </div>

        {phase === "create" && (
          <CreatePhase
            editedAnchor={editedAnchor}
            setEditedAnchor={setEditedAnchor}
            targetUrl={targetUrl}
            setTargetUrl={setTargetUrl}
            verdict={anchorTouched ? verdict : null}
            canValidate={canValidate}
            pending={pending}
            onValidate={onValidate}
            onReject={onReject}
          />
        )}

        {phase !== "create" && link && (
          <PublishPhase
            link={link}
            published={phase === "published"}
            publishedUrl={publishedUrl}
            setPublishedUrl={setPublishedUrl}
            donorDomain={review.source.domain}
            pending={pending}
            onPublish={onPublish}
          />
        )}

        {error && <p style={{ marginTop: 12, fontSize: 12, color: "#fca5a5", lineHeight: 1.45 }}>{error}</p>}
      </Body>
      <BottomNav />
    </>
  );
}

// ── Phase 1 : édition ancre + URL cible ──
function CreatePhase({
  editedAnchor,
  setEditedAnchor,
  targetUrl,
  setTargetUrl,
  verdict,
  canValidate,
  pending,
  onValidate,
  onReject,
}: {
  editedAnchor: string;
  setEditedAnchor: (v: string) => void;
  targetUrl: string;
  setTargetUrl: (v: string) => void;
  verdict: ReturnType<typeof validateAnchor> | null;
  canValidate: boolean;
  pending: boolean;
  onValidate: () => void;
  onReject: () => void;
}) {
  return (
    <>
      <SectionLabel
        action={
          verdict ? (
            <span style={{ fontSize: 9, color: "var(--hub-fg-soft)" }}>
              type : <strong style={{ color: ACCENT_VIOLET }}>{ANCHOR_TYPE_LABEL[verdict.anchorType] ?? verdict.anchorType}</strong>
            </span>
          ) : undefined
        }
      >
        TON ANCRE (RÉÉCRIS-LA AVEC TES MOTS)
      </SectionLabel>
      <input
        type="text"
        value={editedAnchor}
        onChange={(e) => setEditedAnchor(e.target.value)}
        placeholder="ex : notre comparatif des outils SEO 2026"
        style={{
          ...inputBase,
          borderColor: verdict ? `${LEVEL_COLOR[verdict.level]}88` : "rgba(255,255,255,0.14)",
        }}
      />
      {verdict?.reason && (
        <p style={{ margin: "8px 0 0", fontSize: 11, color: LEVEL_COLOR[verdict.level], lineHeight: 1.45 }}>{verdict.reason}</p>
      )}

      <SectionLabel>URL CIBLE (PAGE DU PARTENAIRE À LIER)</SectionLabel>
      <input
        type="url"
        value={targetUrl}
        onChange={(e) => setTargetUrl(e.target.value)}
        placeholder="https://partenaire.com/page"
        style={inputBase}
      />
      <p style={{ margin: "6px 0 0", fontSize: 10, color: "var(--hub-fg-soft)", lineHeight: 1.4 }}>
        Pré-rempli sur l’accueil du partenaire. Précise une page si tu veux pointer plus finement.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button type="button" onClick={onValidate} disabled={!canValidate} style={primaryBtn(canValidate)}>
          {pending ? "Validation…" : "Valider et créer le lien"}
        </button>
        <button type="button" onClick={onReject} disabled={pending} style={secondaryBtn}>
          Rejeter
        </button>
      </div>
    </>
  );
}

// ── Phase 2/3 : publication de l'URL + sceau ──
function PublishPhase({
  link,
  published,
  publishedUrl,
  setPublishedUrl,
  donorDomain,
  pending,
  onPublish,
}: {
  link: EditorialLinkView;
  published: boolean;
  publishedUrl: string;
  setPublishedUrl: (v: string) => void;
  donorDomain: string;
  pending: boolean;
  onPublish: () => void;
}) {
  return (
    <>
      <div
        style={{
          marginTop: 14,
          padding: 12,
          background: "rgba(57,255,20,0.08)",
          border: "1px solid rgba(57,255,20,0.45)",
          borderRadius: 10,
        }}
      >
        <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 7, color: ACCENT_GREEN, letterSpacing: 1.5 }}>
          {published ? "LIEN PUBLIÉ" : "LIEN VALIDÉ"}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hub-fg)", marginTop: 4 }}>
          « {link.anchorText} »{" "}
          <span style={{ fontSize: 10, fontWeight: 400, color: "var(--hub-fg-soft)" }}>
            ({ANCHOR_TYPE_LABEL[link.anchorType] ?? link.anchorType})
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--hub-fg-soft)", marginTop: 4, wordBreak: "break-all" }}>→ {link.targetUrl}</div>
      </div>

      <SectionLabel>URL DE PUBLICATION (SUR {donorDomain.toUpperCase()})</SectionLabel>
      <input
        type="url"
        value={publishedUrl}
        onChange={(e) => setPublishedUrl(e.target.value)}
        placeholder={`https://${donorDomain}/blog/mon-article`}
        style={inputBase}
      />
      <p style={{ margin: "6px 0 0", fontSize: 10, color: "var(--hub-fg-soft)", lineHeight: 1.4 }}>
        Une fois l’article publié sur ton site, colle ici l’URL. Tu pourras ensuite lancer la vérification du lien dans <strong>Sceaux de preuve</strong> pour débloquer tes crédits.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button
          type="button"
          onClick={onPublish}
          disabled={pending || publishedUrl.trim().length === 0}
          style={primaryBtn(!pending && publishedUrl.trim().length > 0)}
        >
          {pending ? "Enregistrement…" : published ? "Mettre à jour l’URL" : "Marquer comme publié"}
        </button>
      </div>
    </>
  );
}

// ── Voix « assistant » (carte qui parle, §8) ──
function AssistantNote({
  phase,
  verdict,
}: {
  phase: "create" | "publish" | "published";
  verdict: ReturnType<typeof validateAnchor> | null;
}) {
  let body: string;
  if (phase === "published") {
    body = "Beau jeu, ton lien est enregistré. File dans « Sceaux de preuve » pour lancer la vérification et débloquer tes crédits.";
  } else if (phase === "publish") {
    body = "Lien validé ! Publie maintenant ton article et colle l’URL ci-dessous. Pas de panique : rien n’est automatique, tu restes l’éditeur.";
  } else if (verdict && !verdict.ok) {
    body = verdict.reason ?? "Reprends l’ancre avec tes mots.";
  } else if (verdict && verdict.level === "warn") {
    body = verdict.reason ?? "Ça passe, mais tu peux faire plus naturel.";
  } else {
    body =
      "Réécris l’ancre proposée avec tes propres mots. Si tout le monde reprend la même formule, les profils de liens se ressemblent — et c’est ce que les moteurs repèrent. Une variation suffit.";
  }
  const tone = verdict && !verdict.ok ? "#fca5a5" : phase === "create" ? ACCENT_VIOLET : ACCENT_GREEN;
  return (
    <div
      style={{
        marginTop: 8,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: 12,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${tone}55`,
        borderRadius: 10,
      }}
    >
      <span style={{ color: tone, flexShrink: 0, marginTop: 1 }}>{icons.sparkle(16)}</span>
      <p style={{ margin: 0, fontSize: 12, color: "var(--hub-fg)", lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/donner/valider"
      style={{
        display: "inline-block",
        marginTop: 8,
        color: ACCENT_VIOLET,
        fontFamily: "var(--font-pixel-display)",
        fontSize: 8,
        letterSpacing: 1,
        textDecoration: "none",
      }}
    >
      ← FILE DE VALIDATION
    </Link>
  );
}

const refBox: CSSProperties = {
  padding: 12,
  background: "rgba(138,43,226,0.07)",
  border: "1px solid rgba(138,43,226,0.3)",
  borderRadius: 10,
};

const inputBase: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 8,
  color: "var(--hub-fg)",
  fontSize: 13,
  fontFamily: "var(--font-hub)",
  outline: "none",
};

function primaryBtn(enabled: boolean): CSSProperties {
  return {
    flex: 1,
    height: 48,
    background: enabled ? ACCENT_GREEN : "rgba(255,255,255,0.08)",
    color: enabled ? "#0f172a" : "var(--hub-fg-soft)",
    fontFamily: "var(--font-hub)",
    fontWeight: 700,
    fontSize: 14,
    border: "none",
    borderRadius: 8,
    cursor: enabled ? "pointer" : "default",
    boxShadow: enabled ? `0 0 18px ${ACCENT_GREEN}55` : "none",
  };
}

const secondaryBtn: CSSProperties = {
  height: 48,
  padding: "0 18px",
  background: "transparent",
  color: "var(--hub-fg-soft)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
