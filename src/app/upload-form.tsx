"use client";

import { useRef, useState, type FormEvent } from "react";
import type { Finding, Risk } from "@/detection";
import { TYPE_LABELS } from "@/lib/scans";
import { Cell, DataTable, Loading, Message, RiskBadge } from "./components";

export interface ScanResult {
  id: string;
  fileName: string;
  overallRisk: Risk;
  totalFindings: number;
  findings: Finding[];
}

const CONTENT_TYPES: Record<string, string> = { csv: "text/csv", txt: "text/plain" };

export function UploadForm({ onSaved }: { onSaved?: () => Promise<void> }) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const file = input.current?.files?.[0];
    setError(null);
    setResult(null);
    if (!file) { setError("Choose a CSV or TXT file."); return; }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!CONTENT_TYPES[extension]) { setError("Only .csv and .txt files are supported."); return; }
    if (file.size < 1 || file.size > 1_048_576) { setError("Choose a file between 1 byte and 1 MiB."); return; }

    setBusy(true);
    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": CONTENT_TYPES[extension], "X-File-Name": encodeURIComponent(file.name) },
        body: file,
      });
      const data: { scan?: ScanResult; error?: { message: string } } = await response.json();
      if (!response.ok || !data.scan) {
        setError(response.status === 401 ? "Your session has expired. Sign in again before uploading."
          : data.error?.message ?? "The scan could not be saved. Try again.");
        return;
      }
      setResult(data.scan);
      if (input.current) input.current.value = "";
      await onSaved?.();
    } catch {
      setError("The request failed. Refresh data before retrying: the scan may already have been saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <p>Synthetic data only. CSV or TXT, 1 byte to 1 MiB. Originals are not retained.</p>
      <form onSubmit={onSubmit} className="stack" aria-busy={busy}>
        <div className="file-picker">
          <label htmlFor="scan-file">Choose a synthetic file</label>
          <input ref={input} id="scan-file" name="file" type="file" accept=".csv,.txt" aria-describedby="file-help" disabled={busy} />
          <p id="file-help" className="muted">Validation and scanning run on the server. Results contain masked examples only.</p>
        </div>
        <div><button className="lp-button lp-button--primary lp-button--md" type="submit" disabled={busy}>{busy ? "Scanning..." : "Upload and scan"}</button></div>
      </form>
      {busy && <Loading label="Scanning and saving..." />}
      {error && <Message title="Upload could not complete">{error}</Message>}
      {result && (
        <section aria-label="Latest scan results" className="stack">
          <Message variant="success" title="Scan saved">{result.fileName}: {result.overallRisk} ({result.totalFindings} findings). Saved to your history; use Refresh data if the dashboard does not update.</Message>
          <p>Classification: <RiskBadge risk={result.overallRisk} /></p>
          {result.findings.length === 0 ? <p>No sensitive-data patterns detected.</p> : (
            <DataTable label="Latest scan findings" columns={["Type", "Risk", "Count", "Masked example"]}>
              {result.findings.map((finding) => (
                <tr key={finding.type}><Cell>{TYPE_LABELS[finding.type]}</Cell><Cell><RiskBadge risk={finding.risk} /></Cell><Cell>{finding.count}</Cell><Cell><code>{finding.maskedExample}</code></Cell></tr>
              ))}
            </DataTable>
          )}
        </section>
      )}
    </div>
  );
}
