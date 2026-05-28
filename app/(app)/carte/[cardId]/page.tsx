import { notFound } from "next/navigation";
import { CardDetailClient } from "./CardDetailClient";
import { getCardDetailView } from "@/lib/data/card-detail";
import { requireSession } from "@/lib/auth-session";

/**
 * /carte/[cardId] — fiche d'une carte du membre (score, détail, rescan hebdo).
 * Les admins voient toute carte et bypassent le quota rescan.
 */
export default async function CardDetailPage({ params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const session = await requireSession();
  const view = await getCardDetailView(session.user.id, session.user.email, cardId);
  if (!view) notFound();

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "32px 20px max(48px, env(safe-area-inset-bottom))",
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <CardDetailClient initial={view} />
    </div>
  );
}
