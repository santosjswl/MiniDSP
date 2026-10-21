import type { FindingType, Risk } from "@/detection";

export const RISKS: Risk[] = ["None", "Low", "Medium", "High", "Critical"];
export const TYPE_LABELS: Record<FindingType, string> = {
  email: "Email",
  uk_phone: "UK phone",
  uk_nino: "UK NINO",
  payment_card: "Payment card",
};

export interface StoredFinding {
  id: string;
  finding_type: FindingType;
  risk: Exclude<Risk, "None">;
  match_count: number;
  masked_example: string;
}

export interface StoredScan {
  id: string;
  file_name: string;
  file_type: "csv" | "txt";
  file_size_bytes: number;
  overall_risk: Risk;
  total_findings: number;
  created_at: string;
  scan_findings: StoredFinding[];
}

export interface ScanHistory {
  scans: StoredScan[];
  redactedExamples: number;
}

const MASKS: Record<FindingType, RegExp> = {
  email: /^[^@\s]\*{3}@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i,
  uk_phone: /^(?:0[1237]\*{6}|\+44\*{7})[0-9]{3}$/,
  uk_nino: /^[A-Z]{2}\*{6}[A-D]?$/,
  payment_card: /^\*{9,15}[0-9]{4}$/,
};

export function redactUnsafeExamples(scans: StoredScan[]): ScanHistory {
  let redactedExamples = 0;
  const safeScans = scans.map((scan) => ({
    ...scan,
    scan_findings: scan.scan_findings.map((finding) => {
      if (MASKS[finding.finding_type]?.test(finding.masked_example)) {
        return finding;
      }
      redactedExamples += 1;
      return { ...finding, masked_example: "Example withheld: invalid stored mask" };
    }),
  }));
  return { scans: safeScans, redactedExamples };
}

export function summarizeScans(scans: StoredScan[]) {
  const distribution: Record<Risk, number> = { None: 0, Low: 0, Medium: 0, High: 0, Critical: 0 };
  let totalFindings = 0;
  for (const scan of scans) {
    distribution[scan.overall_risk] += 1;
    totalFindings += scan.total_findings;
  }
  return {
    files: scans.length,
    totalFindings,
    highFiles: distribution.High,
    criticalFiles: distribution.Critical,
    distribution,
  };
}

export function filterFindings(
  scans: StoredScan[],
  type: FindingType | "all",
  risk: Exclude<Risk, "None"> | "all",
) {
  return scans.flatMap((scan) =>
    scan.scan_findings
      .filter((finding) =>
        (type === "all" || finding.finding_type === type) &&
        (risk === "all" || finding.risk === risk),
      )
      .map((finding) => ({
        ...finding,
        fileName: scan.file_name,
        createdAt: scan.created_at,
        scanId: scan.id,
      })),
  );
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
