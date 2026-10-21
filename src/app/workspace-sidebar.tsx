"use client";

import { useState } from "react";

const ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /> },
  { id: "upload", label: "Upload", icon: <path d="M12 16V4m0 0L7 9m5-5 5 5M4 15v5h16v-5" /> },
  { id: "findings", label: "Findings", icon: <path d="M4 5h16M4 12h16M4 19h16M7 5v.01M7 12v.01M7 19v.01" /> },
];

export function WorkspaceSidebar() {
  const [active, setActive] = useState("dashboard");

  function navigate(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="lp-sidebar app-sidebar" aria-label="Primary" style={{ width: "100px" }}>
      <div className="lp-sidebar__header">
        <span className="sidebar-mark" role="img" aria-label="MiniDSP">M</span>
      </div>
      <ul className="lp-sidebar__items">
        {ITEMS.map(({ id, label, icon }) => (
          <li key={id}>
            <button
              type="button"
              className={`lp-sidebar__item${active === id ? " lp-sidebar__item--active" : ""}`}
              aria-current={active === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <span className="lp-sidebar__icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  {icon}
                </svg>
              </span>
              <span className="lp-sidebar__label">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
