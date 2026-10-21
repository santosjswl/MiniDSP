"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { FindingType, Risk } from "@/detection";
import { filterFindings, formatDate, RISKS, summarizeScans, TYPE_LABELS, type ScanHistory } from "@/lib/scans";
import { Card, Cell, DataTable, EmptyState, Loading, Message, RiskBadge } from "./components";
import { UploadForm } from "./upload-form";

class HistoryError extends Error {}

async function requestHistory(signal?: AbortSignal): Promise<ScanHistory> {
  const response = await fetch("/api/scans", { cache: "no-store", signal });
  if (!response.ok) {
    throw new HistoryError(response.status === 401
      ? "Your session has expired. Sign in again to view scans."
      : "Your scan history could not be loaded. Try again.");
  }
  return response.json();
}

function historyErrorMessage(cause: unknown): string {
  return cause instanceof HistoryError
    ? cause.message : "Your scan history could not be loaded. Try again.";
}

function useScanHistory() {
  const [history, setHistory] = useState<ScanHistory | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setBusy(true);
    setError(null);
    try {
      const data = await requestHistory();
      if (requestId === latestRequest.current) setHistory(data);
    } catch (cause) {
      if (requestId === latestRequest.current) setError(historyErrorMessage(cause));
    } finally {
      if (requestId === latestRequest.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++latestRequest.current;
    const isCurrent = () => !controller.signal.aborted && requestId === latestRequest.current;
    void requestHistory(controller.signal)
      .then((data) => { if (isCurrent()) setHistory(data); })
      .catch((cause: unknown) => { if (isCurrent()) setError(historyErrorMessage(cause)); })
      .finally(() => { if (isCurrent()) setBusy(false); });
    return () => controller.abort();
  }, []);

  return { history, busy, error, refresh };
}

function RadioFilter<T extends string>({
  id, label, value, options, onChange,
}: { id: string; label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className="lp-radio-group" role="radiogroup" aria-labelledby={`${id}-label`}>
      <span className="lp-radio-group__label" id={`${id}-label`}>{label}</span>
      <div className="lp-radio-group__options">
        {options.map((option) => (
          <label className="lp-radio" key={option.value}>
            <span className="lp-radio__control">
              <input className="lp-radio__input" type="radio" name={id} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
              <span className="lp-radio__circle" aria-hidden="true"><span className="lp-radio__dot" /></span>
            </span>
            <span className="lp-radio__label">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function PageIntro({ id, title, description, action }: { id: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="section-header">
      <div>
        <h2 id={id}>{title}</h2>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

function RefreshButton({ busy, onRefresh }: { busy: boolean; onRefresh: () => Promise<void> }) {
  return <button className="lp-button lp-button--secondary lp-button--sm" onClick={() => void onRefresh()} disabled={busy}>Refresh data</button>;
}

function WithheldNotice({ history }: { history: ScanHistory }) {
  if (history.redactedExamples === 0) return null;
  return <Message variant="warning" title="Some examples were withheld">Stored examples with an invalid mask are hidden. Contact your administrator to apply the database masking fix.</Message>;
}

export function DashboardView() {
  const { history, busy, error, refresh } = useScanHistory();
  const scans = history?.scans ?? [];
  const summary = summarizeScans(scans);

  return (
    <section aria-labelledby="dashboard-heading" aria-busy={busy} className="stack">
      <PageIntro
        id="dashboard-heading"
        title="Scan overview"
        description="Totals and risk distribution from your stored scans."
        action={<RefreshButton busy={busy} onRefresh={refresh} />}
      />
      {busy && <Loading label="Loading stored scans..." />}
      {error && <Message title={history ? "Dashboard may be out of date" : "Could not load scans"}>{error} <a className="lp-link lp-link--inline" href="/login">Sign in</a></Message>}
      {!busy && !error && history && (
        <>
          <WithheldNotice history={history} />
          <div className="metrics-grid" aria-label="Scan totals">
            {[
              ["Files scanned", summary.files], ["Total findings", summary.totalFindings],
              ["High-risk files", summary.highFiles], ["Critical files", summary.criticalFiles],
            ].map(([label, value]) => (
              <Card key={label} title={String(label)}><p className="metric-value">{value}</p></Card>
            ))}
          </div>
          {scans.length === 0 ? (
            <EmptyState>No scans yet. <Link className="lp-link lp-link--inline" href="/upload">Upload a synthetic CSV or TXT file</Link> to get started.</EmptyState>
          ) : (
            <div className="dashboard-panels">
              <Card title="Risk distribution">
                <DataTable label="Risk distribution" columns={["Risk level", "Files", "Share of files"]}>
                  {RISKS.map((level) => {
                    const count = summary.distribution[level];
                    const share = summary.files === 0 ? 0 : (count / summary.files) * 100;
                    return (
                      <tr key={level}>
                        <Cell><RiskBadge risk={level} /></Cell>
                        <Cell>{count}</Cell>
                        <Cell>
                          <div className="risk-share">
                            <span className="risk-bar" role="meter" aria-label={`${level} share of files`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share)}>
                              <span className="risk-bar__fill" style={{ width: `${share}%` }} />
                            </span>
                            <span>{Math.round(share)}%</span>
                          </div>
                        </Cell>
                      </tr>
                    );
                  })}
                </DataTable>
              </Card>
              <Card title="Recent scans">
                <DataTable label="Recent scans" columns={["Filename", "Date (UTC)", "Risk", "Findings"]}>
                  {scans.slice(0, 5).map((scan) => (
                    <tr key={scan.id}><Cell>{scan.file_name}</Cell><Cell><time dateTime={scan.created_at}>{formatDate(scan.created_at)}</time></Cell><Cell><RiskBadge risk={scan.overall_risk} /></Cell><Cell>{scan.total_findings}</Cell></tr>
                  ))}
                </DataTable>
              </Card>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function UploadView() {
  return (
    <section aria-labelledby="upload-heading" className="stack">
      <PageIntro
        id="upload-heading"
        title="Upload and scan"
        description="Scan a synthetic CSV or TXT file (1 byte to 1 MiB). The original is never retained."
      />
      <Card title="Choose a file">
        <UploadForm />
      </Card>
    </section>
  );
}

export function FindingsView() {
  const { history, busy, error, refresh } = useScanHistory();
  const [type, setType] = useState<FindingType | "all">("all");
  const [risk, setRisk] = useState<Exclude<Risk, "None"> | "all">("all");
  const scans = history?.scans ?? [];
  const rows = filterFindings(scans, type, risk);

  return (
    <section aria-labelledby="findings-heading" className="stack" aria-busy={busy}>
      <PageIntro
        id="findings-heading"
        title="Masked findings"
        description="Aggregated occurrences per file. Only masked examples are shown. Dates are in UTC."
        action={<RefreshButton busy={busy} onRefresh={refresh} />}
      />
      <Card>
        <div className="stack">
          <div className="filters-grid">
            <RadioFilter<FindingType | "all"> id="finding-type" label="Finding type" value={type} onChange={setType} options={[
              { value: "all", label: "All types" },
              ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value: value as FindingType, label })),
            ]} />
            <RadioFilter<Exclude<Risk, "None"> | "all"> id="finding-risk" label="Risk" value={risk} onChange={setRisk} options={[
              { value: "all", label: "All risks" },
              { value: "Low", label: "Low" }, { value: "Medium", label: "Medium" },
              { value: "High", label: "High" }, { value: "Critical", label: "Critical" },
            ]} />
          </div>
          {busy && <Loading label="Loading findings..." />}
          {error && <Message title="Findings unavailable">{error} <a className="lp-link lp-link--inline" href="/login">Sign in</a></Message>}
          {!busy && !error && history && (
            <div aria-live="polite" className="stack">
              <WithheldNotice history={history} />
              <div className="section-header">
                <p className="muted">{rows.length} finding groups ({rows.reduce((total, row) => total + row.match_count, 0)} occurrences)</p>
                {rows.length > 0 && (
                  <a className="lp-link lp-link--standalone" href={`/api/scans/export?${new URLSearchParams({ type, risk })}`} download>
                    Export filtered findings (CSV, masked)
                  </a>
                )}
              </div>
              {scans.length === 0 ? (
                <EmptyState>No findings yet. <Link className="lp-link lp-link--inline" href="/upload">Run your first scan</Link>.</EmptyState>
              ) : (
                <DataTable label="Masked findings" columns={["Filename", "Date (UTC)", "Type", "Risk", "Count", "Masked example"]}>
                  {rows.length === 0 ? (
                    <tr><td className="lp-table__empty-cell" colSpan={6}>No findings match these filters. Try All types and All risks.</td></tr>
                  ) : rows.map((row) => (
                    <tr key={row.id}><Cell>{row.fileName}</Cell><Cell><time dateTime={row.createdAt}>{formatDate(row.createdAt)}</time></Cell><Cell>{TYPE_LABELS[row.finding_type]}</Cell><Cell><RiskBadge risk={row.risk} /></Cell><Cell>{row.match_count}</Cell><Cell><code>{row.masked_example}</code></Cell></tr>
                  ))}
                </DataTable>
              )}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
