import { describe, expect, it } from "vitest";
import { filterFindings, redactUnsafeExamples, summarizeScans } from "../src/lib/scans";
import { scanFixture } from "./ui-fixtures";

describe("stored scan presentation", () => {
  it("derives totals and distribution from persisted scan counts, including clean files", () => {
    const scans = [
      scanFixture(),
      scanFixture({ id: "high", overall_risk: "High", total_findings: 9, scan_findings: [] }),
      scanFixture({ id: "clean", overall_risk: "None", total_findings: 0, scan_findings: [] }),
    ];
    expect(summarizeScans(scans)).toEqual({
      files: 3, totalFindings: 12, highFiles: 1, criticalFiles: 1,
      distribution: { None: 1, Low: 0, Medium: 0, High: 1, Critical: 1 },
    });
  });

  it("filters finding groups by type AND risk without changing dashboard counts", () => {
    const scans = [scanFixture()];
    expect(filterFindings(scans, "email", "Low")).toHaveLength(1);
    expect(filterFindings(scans, "email", "Critical")).toEqual([]);
    expect(filterFindings(scans, "all", "Critical")).toHaveLength(1);
    expect(filterFindings(scans, "all", "all")).toHaveLength(2);
    expect(summarizeScans(scans).totalFindings).toBe(3);
  });

  it("redacts unsafe legacy masks before serialization and does not mutate records", () => {
    const scan = scanFixture();
    scan.scan_findings[0].masked_example = "alex@example.test*";
    const safe = redactUnsafeExamples([scan]);
    expect(safe.redactedExamples).toBe(1);
    expect(JSON.stringify(safe)).not.toContain("alex@example.test");
    expect(safe.scans[0].scan_findings[1].masked_example).toBe("************1111");
    expect(scan.scan_findings[0].masked_example).toBe("alex@example.test*");
  });

  it("returns real zero totals for an empty history", () => {
    expect(summarizeScans([])).toMatchObject({ files: 0, totalFindings: 0, highFiles: 0, criticalFiles: 0 });
    expect(filterFindings([], "all", "all")).toEqual([]);
  });
});
