import type { FindingType, Risk } from "@/detection";
import { TYPE_LABELS, type StoredScan, filterFindings } from "@/lib/scans";

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Neutralises spreadsheet formulas and quotes every field per RFC 4180. */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export const CSV_HEADER = ["Filename", "Date (UTC)", "Type", "Risk", "Count", "Masked example"];

export function findingsToCsv(
  scans: StoredScan[],
  type: FindingType | "all",
  risk: Exclude<Risk, "None"> | "all",
): string {
  const lines = [CSV_HEADER, ...filterFindings(scans, type, risk).map((row) => [
    row.fileName,
    new Date(row.createdAt).toISOString(),
    TYPE_LABELS[row.finding_type],
    row.risk,
    row.match_count,
    row.masked_example,
  ])].map((fields) => fields.map(csvCell).join(","));
  return `${lines.join("\r\n")}\r\n`;
}
