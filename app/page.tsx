import { DevNav } from "./components/DevNav";
import { HubDashboard } from "./components/hub/HubDashboard";
import { PhoneFrame } from "./components/hub/primitives";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "56px 16px 48px",
      }}
    >
      <DevNav />
      <PhoneFrame>
        <HubDashboard />
      </PhoneFrame>
    </main>
  );
}
