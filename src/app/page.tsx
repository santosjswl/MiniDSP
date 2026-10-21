import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Workspace } from "./workspace";
import { WorkspaceSidebar } from "./workspace-sidebar";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="app-shell">
      <WorkspaceSidebar activeItem="dashboard" />
      <div className="app-main">
        <header className="workspace-topbar">
          <div>
            <p className="eyebrow">Data discovery and classification</p>
            <h1>Dashboard</h1>
          </div>
          <div className="workspace-account">
            <span className="muted">Signed in as {user.email}</span>
            <form method="post" action="/auth/sign-out">
              <button className="lp-button lp-button--secondary lp-button--sm" type="submit">Sign out</button>
            </form>
          </div>
        </header>
        <main className="workspace-content">
          <Workspace />
        </main>
      </div>
    </div>
  );
}
