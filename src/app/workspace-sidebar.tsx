import Link from "next/link";
import type { ReactNode } from "react";

export type WorkspaceItem = "dashboard" | "upload" | "findings";

export const ITEM_LABELS: Record<WorkspaceItem, string> = { dashboard: "Dashboard", upload: "Upload", findings: "Findings" };

const ITEMS: { id: WorkspaceItem; href: string; icon: ReactNode }[] = [
  { id: "dashboard", href: "/", icon: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /> },
  { id: "upload", href: "/upload", icon: <path d="M12 16V4m0 0L7 9m5-5 5 5M4 15v5h16v-5" /> },
  { id: "findings", href: "/findings", icon: <path d="M4 5h16M4 12h16M4 19h16M7 5v.01M7 12v.01M7 19v.01" /> },
];

export function itemForPath(pathname: string | null): WorkspaceItem {
  if (pathname?.startsWith("/upload")) return "upload";
  if (pathname?.startsWith("/findings")) return "findings";
  return "dashboard";
}

export function WorkspaceSidebar({ activeItem }: { activeItem: WorkspaceItem }) {
  return (
    <nav className="lp-sidebar app-sidebar" aria-label="Primary" style={{ width: "var(--app-rail-width)" }}>
      <div className="lp-sidebar__header">
        <span className="sidebar-mark" role="img" aria-label="MiniDSP">M</span>
      </div>
      <ul className="lp-sidebar__items">
        {ITEMS.map(({ id, href, icon }) => (
          <li key={id}>
            <Link
              href={href}
              className={`lp-sidebar__item${activeItem === id ? " lp-sidebar__item--active" : ""}`}
              aria-current={activeItem === id ? "page" : undefined}
            >
              <span className="lp-sidebar__icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  {icon}
                </svg>
              </span>
              <span className="lp-sidebar__label">{ITEM_LABELS[id]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
