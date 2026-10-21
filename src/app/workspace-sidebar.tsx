const ITEMS = [
  { id: "dashboard", label: "Dashboard", href: "/#dashboard", icon: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /> },
  { id: "upload", label: "Upload", href: "/#upload", icon: <path d="M12 16V4m0 0L7 9m5-5 5 5M4 15v5h16v-5" /> },
  { id: "findings", label: "Findings", href: "/#findings", icon: <path d="M4 5h16M4 12h16M4 19h16M7 5v.01M7 12v.01M7 19v.01" /> },
];

const LOGIN_ITEM = {
  id: "login",
  label: "Sign in",
  href: "/login",
  icon: <path d="M11 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8M15 12H3m0 0 4-4m-4 4 4 4" />,
};

export function WorkspaceSidebar({ activeItem }: { activeItem: "dashboard" | "upload" | "findings" | "login" }) {
  const items = activeItem === "login" ? [LOGIN_ITEM] : ITEMS;

  return (
    <nav className="lp-sidebar app-sidebar" aria-label="Primary" style={{ width: "100px" }}>
      <div className="lp-sidebar__header">
        <span className="sidebar-mark" role="img" aria-label="MiniDSP">M</span>
      </div>
      <ul className="lp-sidebar__items">
        {items.map(({ id, label, href, icon }) => (
          <li key={id}>
            <a
              href={href}
              className={`lp-sidebar__item${activeItem === id ? " lp-sidebar__item--active" : ""}`}
              aria-current={activeItem === id ? "page" : undefined}
            >
              <span className="lp-sidebar__icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  {icon}
                </svg>
              </span>
              <span className="lp-sidebar__label">{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
