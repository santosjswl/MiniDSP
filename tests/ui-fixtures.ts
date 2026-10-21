import type { StoredScan } from "../src/lib/scans";

export function scanFixture(overrides: Partial<StoredScan> = {}): StoredScan {
  return {
    id: "scan-1",
    file_name: "synthetic.csv",
    file_type: "csv",
    file_size_bytes: 100,
    overall_risk: "Critical",
    total_findings: 3,
    created_at: "2026-10-21T08:00:00Z",
    scan_findings: [
      { id: "email-1", finding_type: "email", risk: "Low", match_count: 2, masked_example: "a***@example.test" },
      { id: "card-1", finding_type: "payment_card", risk: "Critical", match_count: 1, masked_example: "************1111" },
    ],
    ...overrides,
  };
}
