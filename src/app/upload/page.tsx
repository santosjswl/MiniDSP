import { AppShell } from "../app-shell";
import { requireUserEmail } from "../require-user";
import { UploadView } from "../workspace";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const email = await requireUserEmail();
  return (
    <AppShell activeItem="upload" title="Upload" email={email}>
      <UploadView />
    </AppShell>
  );
}
