import { getLatestPlatformSnapshot, getPlatformSnapshotHistory } from "@/lib/naturality/read";
import { NaturaliteDashboard } from "./NaturaliteDashboard";

/**
 * Loader SERVER de l'écran d'audit de naturalité (P4-A).
 *
 * Charge le dernier snapshot plateforme + l'historique (10 points). Les modules
 * `lib/naturality/read` tirent Prisma → jamais importés depuis le Client ; on
 * passe au Client des DTO déjà sérialisés (`NaturalitySnapshotView`).
 */
export async function NaturaliteLoader() {
  const [latest, history] = await Promise.all([
    getLatestPlatformSnapshot(),
    getPlatformSnapshotHistory(10),
  ]);
  return <NaturaliteDashboard latest={latest} history={history} />;
}
