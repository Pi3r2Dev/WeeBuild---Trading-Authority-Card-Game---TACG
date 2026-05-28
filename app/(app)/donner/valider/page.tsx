import { requireSession } from "@/lib/auth-session";
import { getValidationQueue } from "@/lib/links/read";
import { GAME_LOOP_ENABLED } from "@/app/components/app/flags";
import { Body, ScreenHeader, StatusBar } from "@/app/components/hub/primitives";
import { BottomNav } from "@/app/components/hub/BottomNav";
import { ComingSoon } from "@/app/components/hub/ComingSoon";
import { ValidationQueueClient } from "./ValidationQueueClient";

/**
 * Écran SERVER — file d'attente de validation B3. Charge les suggestions
 * `GENERATED` du user (via site source) et délègue le rendu au client.
 */
export default async function ValiderPage() {
  if (!GAME_LOOP_ENABLED) {
    return (
      <>
        <StatusBar />
        <Body>
          <ScreenHeader title="Valider mes suggestions" subtitle="Disponible avec le moteur de matching." />
          <ComingSoon
            title="La validation des liens arrive bientôt"
            body="Cet écran te permettra de transformer les suggestions IA en liens éditoriaux, après édition de l’ancre."
          />
        </Body>
        <BottomNav />
      </>
    );
  }

  const userId = (await requireSession()).user.id;
  const items = await getValidationQueue(userId);
  return <ValidationQueueClient items={items} />;
}
