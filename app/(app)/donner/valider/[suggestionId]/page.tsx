import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { getSuggestionForReview } from "@/lib/links/read";
import { LinkEditorClient } from "./LinkEditorClient";

/**
 * Écran SERVER — détail d'une suggestion à valider. 404 si introuvable OU non
 * possédée (la garde d'appartenance vit dans `getSuggestionForReview`, qui
 * renvoie `null` plutôt que de fuiter l'existence d'une suggestion d'autrui).
 */
export default async function ValiderDetailPage({
  params,
}: {
  params: Promise<{ suggestionId: string }>;
}) {
  const { suggestionId } = await params;
  const userId = (await requireSession()).user.id;
  const review = await getSuggestionForReview(userId, suggestionId);
  if (!review) notFound();
  return <LinkEditorClient review={review} />;
}
