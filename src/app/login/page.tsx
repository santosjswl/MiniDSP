import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Message } from "../components";

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
    <main className="login-page">
      <div className="login-panel stack">
        <div className="login-brand">
          <span className="sidebar-mark" role="img" aria-label="MiniDSP">M</span>
          <p className="eyebrow">MiniDSP · Data discovery and classification</p>
        </div>
        <div>
          <h1 id="login-title">Sign in</h1>
          <p className="muted">Scan synthetic files and review your masked results.</p>
        </div>
        {message && <Message title="Could not sign in">{message}</Message>}
        <Card elevated>
          <form method="post" action="/auth/sign-in" className="stack" aria-labelledby="login-title">
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
            <button className="lp-button lp-button--primary lp-button--md lp-button--full-width" type="submit">Sign in</button>
          </form>
        </Card>
      </div>
    </main>
  );
}
