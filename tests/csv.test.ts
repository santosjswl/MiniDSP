import { describe, expect, it } from "vitest";
import { csvCell, findingsToCsv } from "../src/lib/csv";
import { redactUnsafeExamples } from "../src/lib/scans";
import { scanFixture } from "./ui-fixtures";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\r" && text[i + 1] === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; }
    else field += ch;
  }
  return rows;
}

describe("CSV safety", () => {
  it.each([
    ["=HYPERLINK(\"http://x.test\",\"y\")", "\"'=HYPERLINK(\"\"http://x.test\"\",\"\"y\"\")\""],
    ["+cmd|' /C calc'!A0", "\"'+cmd|' /C calc'!A0\""],
    ["-1+1", "\"'-1+1\""],
    ["@SUM(A1)", "\"'@SUM(A1)\""],
    ["\t=1", "\"'\t=1\""],
    ["\r=1", "\"'\r=1\""],
  ])("neutralises formula-leading cell %j", (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  it("quotes commas, quotes and newlines without neutralising safe text", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvCell("synthetic.csv")).toBe('"synthetic.csv"');
    expect(csvCell(3)).toBe('"3"');
  });

  it("exports filtered masked rows that round-trip through an RFC 4180 parser", () => {
    const scans = [
      scanFixture({ file_name: '=evil,"name"\n.csv' }),
      scanFixture({ id: "scan-2", file_name: "other.txt", scan_findings: [] }),
    ];
    const rows = parseCsv(findingsToCsv(scans, "all", "all"));
    expect(rows).toEqual([
      ["Filename", "Date (UTC)", "Type", "Risk", "Count", "Masked example"],
      ["'=evil,\"name\"\n.csv", "2026-10-21T08:00:00.000Z", "Email", "Low", "2", "a***@example.test"],
      ["'=evil,\"name\"\n.csv", "2026-10-21T08:00:00.000Z", "Payment card", "Critical", "1", "************1111"],
    ]);
    expect(parseCsv(findingsToCsv(scans, "payment_card", "Critical"))).toHaveLength(2);
    expect(parseCsv(findingsToCsv(scans, "email", "Critical"))).toHaveLength(1);
  });

  it("never exports a malformed stored example once redacted", () => {
    const scan = scanFixture();
    scan.scan_findings[0].masked_example = "alex@example.test*";
    const csv = findingsToCsv(redactUnsafeExamples([scan]).scans, "all", "all");
    expect(csv).not.toContain("alex@example.test");
    expect(csv).toContain("Example withheld: invalid stored mask");
  });
});
