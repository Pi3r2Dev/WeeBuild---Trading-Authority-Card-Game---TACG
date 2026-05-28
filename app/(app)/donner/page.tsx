import { DonnerFlowLoader } from "@/app/components/hub/DonnerFlowLoader";

export default async function DonnerPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const { site } = await searchParams;
  return <DonnerFlowLoader sourceSiteId={site} />;
}
