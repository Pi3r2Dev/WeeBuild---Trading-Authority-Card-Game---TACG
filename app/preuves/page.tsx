import { PreuveScreenLoader } from "../components/hub/PreuveScreenLoader";
import { PhoneShell } from "../components/hub/PhoneShell";

export default function PreuvesPage() {
  return (
    <PhoneShell>
      <PreuveScreenLoader />
    </PhoneShell>
  );
}
