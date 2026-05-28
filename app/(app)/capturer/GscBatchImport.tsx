"use client";

/**
 * Import batch Search Console — sélection multi-propriétés + suivi de lot.
 * Complète la capture unitaire par URL sur `/capturer`.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import type { GscImportCandidate } from "@/lib/gsc/batch-import";
import {
  getActiveGscImportBatchAction,
  getGscImportBatchStatusAction,
  listGscImportCandidatesAction,
  startGscImportBatchAction,
  tickGscImportQueueAction,
  type GscBatchFailure,
} from "./gsc-batch-actions";

const PIXEL: CSSProperties = { fontFamily: "var(--font-pixel-display)", letterSpacing: 1 };

type BatchProgress = Extract<
  Awaited<ReturnType<typeof getGscImportBatchStatusAction>>,
  { ok: true }
>["progress"];

export function GscBatchImport() {
  const [candidates, setCandidates] = useState<GscImportCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [allowDelegatedEnv, setAllowDelegatedEnv] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [loading, startLoad] = useTransition();
  const [starting, startBatch] = useTransition();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const importable = candidates.filter((c) => !c.alreadyImported);
  const busy = loading || starting;

  const refreshCandidates = useCallback(() => {
    startLoad(async () => {
      setLoadError(null);
      const res = await listGscImportCandidatesAction();
      if (!res.ok) {
        setLoadError((res as GscBatchFailure).error);
        return;
      }
      setCandidates(res.candidates);
      setAllowDelegatedEnv(res.allowDelegatedEnv);
      setSelected(new Set(res.candidates.filter((c) => !c.alreadyImported).map((c) => c.gscProperty)));
    });
  }, []);

  const pollProgress = useCallback(async (batchId: string) => {
    await tickGscImportQueueAction();
    const res = await getGscImportBatchStatusAction(batchId);
    if (res.ok) setProgress(res.progress);
  }, []);

  useEffect(() => {
    refreshCandidates();
    startLoad(async () => {
      const active = await getActiveGscImportBatchAction();
      if (active.ok && active.progress) {
        setProgress(active.progress);
      }
    });
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshCandidates]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (!progress || progress.pendingItems === 0) return;

    pollRef.current = setInterval(() => {
      void pollProgress(progress.batchId);
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [progress, pollProgress]);

  useEffect(() => {
    if (progress && progress.pendingItems === 0 && progress.status !== "PENDING") {
      refreshCandidates();
    }
  }, [progress, refreshCandidates]);

  function toggleProperty(property: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(property)) next.delete(property);
      else next.add(property);
      return next;
    });
  }

  function runBatch(mode: "all" | "selected") {
    setActionError(null);
    startBatch(async () => {
      const payload =
        mode === "all" ? ("all" as const) : ([...selected] as string[]);
      const res = await startGscImportBatchAction(payload);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      setProgress(res.progress);
    });
  }

  const doneCount = progress
    ? progress.completedItems + progress.failedItems + progress.skippedItems
    : 0;
  const pct = progress && progress.totalItems > 0 ? Math.round((doneCount / progress.totalItems) * 100) : 0;

  return (
    <section
      style={{
        marginTop: 8,
        padding: "20px 18px",
        background: "rgba(57,255,20,0.04)",
        border: "1px solid rgba(57,255,20,0.28)",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ ...PIXEL, fontSize: 10, color: "var(--hub-accent-2)", marginBottom: 6 }}>
            IMPORT SEARCH CONSOLE
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--hub-fg)" }}>
            Déclarer plusieurs sites en lot
          </h2>
        </div>
        <button
          type="button"
          onClick={refreshCandidates}
          disabled={busy}
          style={{
            padding: "6px 12px",
            background: "transparent",
            border: "1px solid var(--hub-line)",
            borderRadius: 8,
            color: "var(--hub-fg-soft)",
            fontSize: 12,
            cursor: busy ? "default" : "pointer",
          }}
        >
          Actualiser
        </button>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--hub-fg-soft)", lineHeight: 1.5, margin: "10px 0 16px" }}>
        Propriétés où tu es <strong style={{ color: "var(--hub-accent-2)" }}>propriétaire vérifié</strong> dans
        Search Console. Les accès « gestion seule » (limités ou délégués) sont exclus
        {allowDelegatedEnv ? " sauf délégués activés côté serveur." : " — activation future pour gestionnaires multi-sites."}
      </p>

      {loadError && <ErrorBox message={loadError} />}
      {actionError && <ErrorBox message={actionError} />}

      {progress && progress.pendingItems > 0 && (
        <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--hub-bg-2)", borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
            <span style={{ color: "var(--hub-fg)" }}>Import en cours…</span>
            <span style={{ color: "var(--hub-fg-soft)" }}>
              {doneCount}/{progress.totalItems} · {pct}%
            </span>
          </div>
          <div style={{ height: 6, background: "var(--hub-bg)", borderRadius: 999, overflow: "hidden" }}>
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "var(--hub-accent-2)",
                borderRadius: 999,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      )}

      {progress && progress.pendingItems === 0 && progress.status !== "PENDING" && (
        <BatchSummary progress={progress} />
      )}

      {loading && candidates.length === 0 && (
        <p style={{ color: "var(--hub-fg-soft)", fontSize: 13 }}>Chargement de tes propriétés Search Console…</p>
      )}

      {!loading && candidates.length === 0 && !loadError && (
        <p style={{ color: "var(--hub-fg-soft)", fontSize: 13, lineHeight: 1.5 }}>
          Aucune propriété éligible trouvée. Vérifie tes sites dans Search Console avec le même compte Google
          qu&apos;à la connexion, en tant que <strong>propriétaire</strong>.
        </p>
      )}

      {candidates.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, maxHeight: 280, overflowY: "auto" }}>
            {candidates.map((c) => (
              <CandidateRow
                key={c.gscProperty}
                candidate={c}
                checked={selected.has(c.gscProperty)}
                disabled={busy || c.alreadyImported || (progress?.pendingItems ?? 0) > 0}
                onToggle={() => toggleProperty(c.gscProperty)}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={busy || importable.length === 0 || (progress?.pendingItems ?? 0) > 0}
              onClick={() => runBatch("selected")}
              style={primaryBtnStyle(busy || selected.size === 0)}
            >
              {starting ? "Lancement…" : `Importer la sélection (${selected.size})`}
            </button>
            <button
              type="button"
              disabled={busy || importable.length === 0 || (progress?.pendingItems ?? 0) > 0}
              onClick={() => runBatch("all")}
              style={secondaryBtnStyle()}
            >
              Importer tout ({importable.length})
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function CandidateRow({
  candidate,
  checked,
  disabled,
  onToggle,
}: {
  candidate: GscImportCandidate;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 12px",
        background: candidate.alreadyImported ? "rgba(255,255,255,0.02)" : "var(--hub-bg-2)",
        border: `1px solid ${candidate.alreadyImported ? "var(--hub-line)" : "rgba(57,255,20,0.2)"}`,
        borderRadius: 8,
        opacity: candidate.alreadyImported ? 0.55 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled || candidate.alreadyImported}
        onChange={onToggle}
        style={{ marginTop: 3 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--hub-fg)", wordBreak: "break-all" }}>
          {candidate.domain}
        </div>
        <div style={{ fontSize: 11, color: "var(--hub-fg-dim)", marginTop: 2 }}>{candidate.gscProperty}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <MiniBadge text={candidate.permissionLabel} accent={candidate.isOwner} />
          {candidate.alreadyImported && <MiniBadge text="Déjà importé" />}
        </div>
      </div>
    </label>
  );
}

function BatchSummary({ progress }: { progress: BatchProgress }) {
  const ok = progress.completedItems;
  const fail = progress.failedItems;
  const skip = progress.skippedItems;

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "12px 14px",
        background: ok > 0 ? "rgba(57,255,20,0.08)" : "rgba(251,191,36,0.08)",
        border: `1px solid ${ok > 0 ? "rgba(57,255,20,0.35)" : "rgba(251,191,36,0.3)"}`,
        borderRadius: 8,
        fontSize: 12.5,
        lineHeight: 1.5,
      }}
    >
      <strong>Import terminé</strong> — {ok} carte{ok > 1 ? "s" : ""} créée{ok > 1 ? "s" : ""}
      {fail > 0 ? ` · ${fail} échec${fail > 1 ? "s" : ""}` : ""}
      {skip > 0 ? ` · ${skip} ignoré${skip > 1 ? "s" : ""}` : ""}.
      {ok > 0 && (
        <>
          {" "}
          <Link href="/" style={{ color: "var(--hub-accent-2)", fontWeight: 700 }}>
            Voir ma main →
          </Link>
        </>
      )}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        marginBottom: 12,
        background: "rgba(220,38,38,0.12)",
        border: "1px solid rgba(220,38,38,0.4)",
        borderRadius: 8,
        color: "#fca5a5",
        fontSize: 12.5,
      }}
    >
      {message}
    </div>
  );
}

function MiniBadge({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <span
      style={{
        ...PIXEL,
        fontSize: 8,
        padding: "3px 7px",
        borderRadius: 999,
        border: `1px solid ${accent ? "var(--hub-accent-2)" : "var(--hub-line)"}`,
        color: accent ? "var(--hub-accent-2)" : "var(--hub-fg-soft)",
      }}
    >
      {text}
    </span>
  );
}

function primaryBtnStyle(disabled: boolean): CSSProperties {
  return {
    padding: "10px 16px",
    background: disabled ? "var(--hub-bg-2)" : "var(--hub-accent-2)",
    color: disabled ? "var(--hub-fg-soft)" : "#0a0a0a",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: disabled ? "default" : "pointer",
  };
}

function secondaryBtnStyle(): CSSProperties {
  return {
    padding: "10px 16px",
    background: "transparent",
    color: "var(--hub-accent-2)",
    border: "1px solid rgba(57,255,20,0.45)",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  };
}
