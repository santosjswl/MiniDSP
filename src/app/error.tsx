"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./app-shell";
import { Message } from "./components";
import { itemForPath, ITEM_LABELS } from "./workspace-sidebar";

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const item = itemForPath(usePathname());
  return (
    <AppShell activeItem={item} title={ITEM_LABELS[item]}>
      <div className="stack">
        <Message title="Workspace unavailable">Your workspace could not be loaded. Try again, or sign in again if your session has expired.</Message>
        <div className="flow-row">
          <button className="lp-button lp-button--secondary lp-button--md" onClick={reset}>Try again</button>
          <a className="lp-link lp-link--standalone" href="/login">Sign in</a>
        </div>
      </div>
    </AppShell>
  );
}
