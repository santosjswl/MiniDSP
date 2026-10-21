import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Workspace } from "./workspace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="product-shell">
      <header className="section-header">
        <div><p className="eyebrow">Data discovery and classification</p><h1>MiniDSP</h1><p className="muted">Signed in as {user.email}</p></div>
        <form method="post" action="/auth/sign-out">
          <button className="lp-button lp-button--secondary lp-button--md" type="submit">Sign out</button>
        </form>
      </header>
      <nav className="flow-row" aria-label="Workspace sections">
        <a className="lp-link lp-link--standalone" href="#upload">Upload</a>
        <a className="lp-link lp-link--standalone" href="#dashboard">Dashboard</a>
        <a className="lp-link lp-link--standalone" href="#findings">Findings</a>
      </nav>
      <Workspace />
    </main>
  );
}
