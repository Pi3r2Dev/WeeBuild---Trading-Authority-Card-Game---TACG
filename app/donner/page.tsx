import { DonnerFlowLoader } from "../components/hub/DonnerFlowLoader";
import { PhoneShell } from "../components/hub/PhoneShell";

export default function DonnerPage() {
  return (
    <PhoneShell>
      <DonnerFlowLoader />
    </PhoneShell>
  );
}
