"use client";

import { Message } from "./components";

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="product-shell stack">
      <h1>MiniDSP</h1>
      <Message title="Workspace unavailable">Your workspace could not be loaded. Try again, or sign in again if your session has expired.</Message>
      <div className="flow-row">
        <button className="lp-button lp-button--secondary lp-button--md" onClick={reset}>Try again</button>
        <a className="lp-link lp-link--standalone" href="/login">Sign in</a>
      </div>
    </main>
  );
}
