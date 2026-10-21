import type { ReactNode } from "react";
import type { Risk } from "@/detection";

export function Card({
  title, elevated = false, children,
}: { title?: string; elevated?: boolean; children: ReactNode }) {
  return (
    <div className={elevated ? "lp-card lp-card--elevated lp-card--borderless" : "lp-card"}>
      {title && (
        <div className="lp-card__header">
          <div className="lp-card__title" role="heading" aria-level={3}>{title}</div>
        </div>
      )}
      <div className="lp-card__body">{children}</div>
    </div>
  );
}

export function RiskBadge({ risk }: { risk: Risk }) {
  const variant = risk === "Critical" ? "error"
    : risk === "High" || risk === "Medium" ? "warning"
    : risk === "Low" ? "default" : "neutral";
  return <span className={`lp-badge lp-badge--${variant}`}>{risk}</span>;
}

export function Message({
  title, children, variant = "error",
}: { title: string; children: ReactNode; variant?: "error" | "success" | "warning" }) {
  return (
    <div className={`lp-message lp-message--${variant}`} role={variant === "error" ? "alert" : "status"}>
      <span className="lp-message__icon">
        <svg viewBox="0 0 45 45" fill="none" aria-hidden="true">
          <circle cx="22.5" cy="22.5" r="19" stroke="currentColor" strokeWidth="3" />
          <path d="M22.5 12v13m0 5v2" stroke="currentColor" strokeWidth="3" />
        </svg>
      </span>
      <div className="lp-message__content">
        <div className="lp-message__text">
          <h3 className="lp-message__title">{title}</h3>
          <p className="lp-message__body">{children}</p>
        </div>
      </div>
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="flow-row" aria-live="polite">
      <span className="lp-spinner lp-spinner--sm" role="status">
        <svg className="lp-spinner__svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="lp-spinner__track" cx="12" cy="12" r="10" strokeWidth="3" />
          <circle className="lp-spinner__arc" cx="12" cy="12" r="10" strokeWidth="3" strokeLinecap="round" pathLength="100" strokeDasharray="28 72" />
        </svg>
        <span className="lp-spinner__visually-hidden">{label}</span>
      </span>
      <span aria-hidden="true">{label}</span>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="lp-empty-state">
      <span className="lp-empty-state__illustration">
        <svg width="120" height="70" viewBox="0 0 120 70" fill="none" stroke="var(--color-border-strong)" strokeWidth="2" aria-hidden="true">
          <rect x="20" y="10" width="80" height="22" rx="4" />
          <rect x="20" y="38" width="80" height="22" rx="4" />
          <circle cx="32" cy="21" r="3" /><circle cx="32" cy="49" r="3" />
          <path d="M44 21h32M44 49h20" />
        </svg>
      </span>
      <p className="lp-empty-state__message">{children}</p>
    </div>
  );
}

export function DataTable({
  label, columns, children,
}: { label: string; columns: string[]; children: ReactNode }) {
  return (
    <div className="table-scroll" role="region" aria-label={`${label} (scroll horizontally on small screens)`} tabIndex={0}>
      <div className="table-canvas" style={{ minInlineSize: `calc(var(--space-14) * ${columns.length * 3})` }}>
        <div className="lp-table">
          <table className="lp-table__table" aria-label={label}>
            <thead><tr>{columns.map((column) => (
              <th key={column} className="lp-table__th" scope="col">
                <div className="lp-table__header-inner"><span className="lp-table__header-label">{column}</span></div>
              </th>
            ))}</tr></thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function Cell({ children }: { children: ReactNode }) {
  return <td className="lp-table__td"><div className="lp-table__cell-inner"><span className="lp-table__cell-text">{children}</span></div></td>;
}
