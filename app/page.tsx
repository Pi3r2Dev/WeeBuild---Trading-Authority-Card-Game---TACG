import { HubDashboard } from "./components/hub/HubDashboard";
import { PhoneShell } from "./components/hub/PhoneShell";

export default function Home() {
  return (
    <PhoneShell>
      <HubDashboard />
    </PhoneShell>
  );
}
