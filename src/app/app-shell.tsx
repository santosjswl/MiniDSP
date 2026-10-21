import type { ReactNode } from "react";
import { WorkspaceSidebar, type WorkspaceItem } from "./workspace-sidebar";

export function AppShell({ activeItem, title, email, children }: {
  activeItem: WorkspaceItem;
  title: string;
  email?: string;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <WorkspaceSidebar activeItem={activeItem} />
      <div className="app-main">
        <header className="workspace-topbar">
          <div>
            <p className="eyebrow">Data discovery and classification</p>
            <h1>{title}</h1>
          </div>
          {email && (
            <div className="workspace-account">
              <span className="muted">Signed in as {email}</span>
              <form method="post" action="/auth/sign-out">
                <button className="lp-button lp-button--secondary lp-button--sm" type="submit">Sign out</button>
              </form>
            </div>
          )}
        </header>
        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}
