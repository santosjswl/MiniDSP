import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Message } from "../components";
import { WorkspaceSidebar } from "../workspace-sidebar";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  invalid: "Sign-in failed. Check your email and password.",
  unavailable: "Sign-in is temporarily unavailable.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error } = await searchParams;
  const message = error ? (MESSAGES[error] ?? MESSAGES.invalid) : null;

  return (
    <div className="app-shell">
      <WorkspaceSidebar activeItem="login" />
      <div className="app-main">
        <header className="workspace-topbar">
          <div>
            <p className="eyebrow">Data discovery and classification</p>
            <h1>MiniDSP sign in</h1>
          </div>
        </header>
        <main className="workspace-content">
          <section className="workspace-section stack login-shell" aria-labelledby="login-title">
            <h2 id="login-title">Welcome back</h2>
            <p className="muted">Sign in to scan synthetic files and review your masked results.</p>
            {message && <Message title="Could not sign in">{message}</Message>}
            <Card title="Your training workspace">
              <form method="post" action="/auth/sign-in" className="stack">
                <div className="lp-input lp-input--full-width">
                  <div className="lp-input__row lp-input__row--label-top">
                    <label className="lp-input__label" htmlFor="email">Email</label>
                    <div className="lp-input__field"><input className="lp-input__input" id="email" name="email" type="email" autoComplete="username" required /></div>
                  </div>
                </div>
                <div className="lp-input lp-input--full-width">
                  <div className="lp-input__row lp-input__row--label-top">
                    <label className="lp-input__label" htmlFor="password">Password</label>
                    <div className="lp-input__field"><input className="lp-input__input" id="password" name="password" type="password" autoComplete="current-password" required /></div>
                  </div>
                </div>
                <button className="lp-button lp-button--primary lp-button--md" type="submit">Sign in</button>
              </form>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
