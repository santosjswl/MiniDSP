import { AppShell } from "../app-shell";
import { requireUserEmail } from "../require-user";
import { FindingsView } from "../workspace";

export const dynamic = "force-dynamic";

export default async function FindingsPage() {
  const email = await requireUserEmail();
  return (
    <AppShell activeItem="findings" title="Findings" email={email}>
      <FindingsView />
    </AppShell>
  );
}
