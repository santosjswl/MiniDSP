import { AppShell } from "./app-shell";
import { requireUserEmail } from "./require-user";
import { DashboardView } from "./workspace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const email = await requireUserEmail();
  return (
    <AppShell activeItem="dashboard" title="Dashboard" email={email}>
      <DashboardView />
    </AppShell>
  );
}
