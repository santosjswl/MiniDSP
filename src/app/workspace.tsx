"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export function Workspace() {
  const [history, setHistory] = useState<ScanHistory | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<FindingType | "all">("all");
  const [risk, setRisk] = useState<Exclude<Risk, "None"> | "all">("all");
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

  const scans = history?.scans ?? [];
  const summary = summarizeScans(scans);
  const rows = filterFindings(scans, type, risk);

  return (
    <div className="stack">
      <section id="dashboard" aria-labelledby="dashboard-heading" aria-busy={busy} className="stack">
        <div className="section-header">
          <div>
            <h2 id="dashboard-heading">Scan overview</h2>
            <p className="muted">A live view of your stored scans and classified findings.</p>
          </div>
          <button className="lp-button lp-button--secondary lp-button--sm" onClick={() => void refresh()} disabled={busy}>Refresh data</button>
        </div>
        {busy && <Loading label="Loading stored scans..." />}
        {error && <Message title={history ? "Dashboard may be out of date" : "Could not load scans"}>{error} <a className="lp-link lp-link--inline" href="/login">Sign in</a></Message>}
        {!busy && !error && history && (
          <>
            {history.redactedExamples > 0 && <Message variant="warning" title="Some examples were withheld">Stored examples with an invalid mask are hidden. Contact your administrator to apply the database masking fix.</Message>}
            <div className="metrics-grid" aria-label="Scan totals">
              {[
                ["Files scanned", summary.files], ["Total findings", summary.totalFindings],
                ["High-risk files", summary.highFiles], ["Critical files", summary.criticalFiles],
              ].map(([label, value]) => (
                <Card key={label} title={String(label)}><p className="metric-value">{value}</p></Card>
              ))}
            </div>
            {scans.length === 0 ? (
              <EmptyState>No scans yet. Upload a synthetic CSV or TXT file to get started.</EmptyState>
            ) : (
              <div className="dashboard-panels">
                <Card title="Risk distribution">
                  <p className="muted">Files grouped by their highest detected risk.</p>
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

      <section id="upload" aria-labelledby="upload-heading" className="stack">
        <div>
          <h2 id="upload-heading">Upload and scan</h2>
          <p className="muted">Scan a synthetic CSV or TXT file. The original is never retained.</p>
        </div>
        <Card title="Choose a file">
          <UploadForm onSaved={() => refresh()} />
        </Card>
      </section>

      <section id="findings" aria-labelledby="findings-heading" className="stack" aria-busy={busy}>
        <h2 id="findings-heading">Findings</h2>
        <p className="muted">Aggregated occurrences. Only masked examples are shown. Dates are in UTC.</p>
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
        {!busy && !error && history && (
          <div aria-live="polite">
            <div className="section-header">
              <p>{rows.length} finding groups ({rows.reduce((total, row) => total + row.match_count, 0)} occurrences)</p>
              {rows.length > 0 && (
                <a className="lp-link lp-link--standalone" href={`/api/scans/export?${new URLSearchParams({ type, risk })}`} download>
                  Export filtered findings (CSV, masked)
                </a>
              )}
            </div>
            {scans.length === 0 ? <EmptyState>No findings yet. Run your first scan above.</EmptyState> : (
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
        {busy && <Loading label="Loading findings..." />}
        {!busy && error && <Message title="Findings unavailable">Refresh data to try again. No findings are shown while the request is failing.</Message>}
      </section>
    </div>
  );
}
