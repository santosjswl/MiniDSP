"use client";

import { Message } from "./components";
import { WorkspaceSidebar } from "./workspace-sidebar";

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="app-shell">
      <WorkspaceSidebar activeItem="dashboard" />
      <div className="app-main">
        <header className="workspace-topbar">
          <div>
            <p className="eyebrow">Data discovery and classification</p>
            <h1>MiniDSP</h1>
          </div>
        </header>
        <main className="workspace-content">
          <section className="workspace-section stack">
            <Message title="Workspace unavailable">Your workspace could not be loaded. Try again, or sign in again if your session has expired.</Message>
            <div className="flow-row">
              <button className="lp-button lp-button--secondary lp-button--md" onClick={reset}>Try again</button>
              <a className="lp-link lp-link--standalone" href="/login">Sign in</a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
