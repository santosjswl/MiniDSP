// REAL end-to-end checks: a running app (MINIDSP_BASE_URL) plus the development Supabase project.
import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FindingType } from "@/detection";
import { filterFindings, summarizeScans, TYPE_LABELS, type ScanHistory } from "@/lib/scans";
import {
  RAW_SYNTHETIC_VALUES,
  requireEnv,
  signedInClient,
  SYNTHETIC_CONTENT,
} from "./helpers";

const MAX = 1_048_576;
const runId = `e2e-${Date.now()}`;
let baseUrl: string;
let cookie: string;
let a: SupabaseClient;
let b: SupabaseClient;

async function signInViaApp(email: string, password: string) {
  const response = await fetch(`${baseUrl}/auth/sign-in`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password }),
  });
  const cookies = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { response, cookies };
}

function upload(body: BodyInit, name: string, type: string, withCookie = true) {
  return fetch(`${baseUrl}/api/scans`, {
    method: "POST",
    headers: {
      "content-type": type,
      "x-file-name": encodeURIComponent(name),
      ...(withCookie ? { cookie } : {}),
    },
    body,
  });
}

async function scanCount(client: SupabaseClient) {
  const { count, error } = await client
    .from("scans")
    .select("id", { count: "exact", head: true });
  expect(error).toBeNull();
  return count ?? 0;
}

beforeAll(async () => {
  const env = requireEnv();
  baseUrl = process.env.MINIDSP_BASE_URL ?? "http://localhost:3000";
  ({ client: a } = await signedInClient("A"));
  ({ client: b } = await signedInClient("B"));

  const { response, cookies } = await signInViaApp(
    env.MINIDSP_TEST_USER_A_EMAIL,
    env.MINIDSP_TEST_USER_A_PASSWORD,
  );
  expect(response.status).toBe(303);
  expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/");
  expect(cookies).toContain("sb-");
  cookie = cookies;
});

describe("Upload endpoint end-to-end (REAL app + dev database)", () => {
  it("rejects a wrong password with a generic redirect and no session", async () => {
    const { response, cookies } = await signInViaApp(
      requireEnv().MINIDSP_TEST_USER_A_EMAIL,
      "definitely-wrong-password",
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login?error=invalid");
    expect(cookies).not.toContain("auth-token=");
  });

  it("rejects unauthenticated uploads", async () => {
    const response = await upload(SYNTHETIC_CONTENT, `${runId}.csv`, "text/csv", false);
    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated history reads", async () => {
    const response = await fetch(`${baseUrl}/api/scans`);
    expect(response.status).toBe(401);
  });

  it("rejects invalid uploads without creating records", async () => {
    const before = await scanCount(a);
    const cases: [BodyInit, string, string, number][] = [
      [new Uint8Array(0), `${runId}-empty.csv`, "text/csv", 400],
      [new Uint8Array(MAX + 1).fill(97), `${runId}-big.csv`, "text/csv", 413],
      [new Uint8Array([0x41, 0x00, 0x42]), `${runId}-bin.csv`, "text/csv", 422],
      [new Uint8Array([0x41, 0xff, 0xfe]), `${runId}-utf8.txt`, "text/plain", 422],
      ["a", `${runId}.exe`, "text/plain", 415],
      ["a", `${runId}-type.csv`, "application/pdf", 415],
    ];
    for (const [body, name, type, status] of cases) {
      const response = await upload(body, name, type);
      expect(response.status, name).toBe(status);
    }
    expect(await scanCount(a)).toBe(before);
  });

  it("accepts an exactly-1 MiB file", async () => {
    const response = await upload(new Uint8Array(MAX).fill(97), `${runId}-max.txt`, "text/plain");
    expect(response.status).toBe(201);
  });

  it("saves a scan whose response and stored rows contain only masked values", async () => {
    const response = await upload(SYNTHETIC_CONTENT, `${runId}-mixed.csv`, "text/csv");
    const bodyText = await response.text();
    expect(response.status).toBe(201);
    const { scan } = JSON.parse(bodyText) as { scan: { id: string; overallRisk: string } };
    expect(scan.overallRisk).toBe("Critical");

    const stored = await a
      .from("scans")
      .select("*, scan_findings(*)")
      .eq("id", scan.id)
      .single();
    expect(stored.error).toBeNull();
    expect(stored.data?.total_findings).toBe(5);
    expect(stored.data?.scan_findings).toHaveLength(4);

    const serialized = bodyText + JSON.stringify(stored.data);
    for (const raw of RAW_SYNTHETIC_VALUES) expect(serialized).not.toContain(raw);

    const hidden = await b.from("scans").select("id").eq("id", scan.id);
    expect(hidden.data).toEqual([]);
  });

  it("loads owner-only history with database-consistent dashboard totals and safe examples", async () => {
    const response = await fetch(`${baseUrl}/api/scans`, { headers: { cookie } });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const text = await response.text();
    const history: ScanHistory = JSON.parse(text);
    const summary = summarizeScans(history.scans);
    const { count, error } = await a.from("scans").select("id", { count: "exact", head: true });
    expect(error).toBeNull();
    expect(summary.files).toBe(count);
    expect(summary.totalFindings).toBe(history.scans.reduce((total, scan) => total + scan.total_findings, 0));
    for (const raw of RAW_SYNTHETIC_VALUES) expect(text).not.toContain(raw);

    const { response: signIn, cookies: bCookie } = await signInViaApp(
      requireEnv().MINIDSP_TEST_USER_B_EMAIL,
      requireEnv().MINIDSP_TEST_USER_B_PASSWORD,
    );
    expect(signIn.status).toBe(303);
    const bResponse = await fetch(`${baseUrl}/api/scans`, { headers: { cookie: bCookie } });
    expect(bResponse.status).toBe(200);
    const bHistory: ScanHistory = await bResponse.json();
    const aIds = new Set(history.scans.map((scan) => scan.id));
    expect(bHistory.scans.some((scan) => aIds.has(scan.id))).toBe(false);
  });
});

async function allRows<T>(client: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from(table).select(columns).order("id").range(offset, offset + 999);
    expect(error).toBeNull();
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
}

function csvRows(text: string): string[][] {
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

describe("Milestone 4 QA: totals, filters and CSV export (REAL app + dev database)", () => {
  const formulaName = `=HYPERLINK("x.test")-${runId}.csv`;
  let historyA: ScanHistory;

  beforeAll(async () => {
    const saved = await upload(SYNTHETIC_CONTENT, formulaName, "text/csv");
    expect(saved.status).toBe(201);
    const response = await fetch(`${baseUrl}/api/scans`, { headers: { cookie } });
    expect(response.status).toBe(200);
    historyA = await response.json();
  });

  it("matches dashboard totals and risk distribution to direct owner-scoped database rows", async () => {
    const rows = await allRows<{ overall_risk: string; total_findings: number }>(a, "scans", "id,overall_risk,total_findings");
    const summary = summarizeScans(historyA.scans);
    expect(summary.files).toBe(rows.length);
    expect(summary.totalFindings).toBe(rows.reduce((sum, row) => sum + row.total_findings, 0));
    for (const level of ["None", "Low", "Medium", "High", "Critical"] as const) {
      expect(summary.distribution[level], level).toBe(rows.filter((row) => row.overall_risk === level).length);
    }
  });

  it("matches every type/risk filter combination to direct database finding rows", async () => {
    const findings = await allRows<{ finding_type: FindingType; risk: string; match_count: number }>(
      a, "scan_findings", "id,finding_type,risk,match_count",
    );
    for (const type of ["all", ...Object.keys(TYPE_LABELS)] as (FindingType | "all")[]) {
      for (const risk of ["all", "Low", "Medium", "High", "Critical"] as const) {
        const expected = findings.filter((f) => (type === "all" || f.finding_type === type) && (risk === "all" || f.risk === risk));
        const shown = filterFindings(historyA.scans, type, risk);
        expect(shown.length, `${type}/${risk}`).toBe(expected.length);
        expect(shown.reduce((sum, f) => sum + f.match_count, 0)).toBe(expected.reduce((sum, f) => sum + f.match_count, 0));
      }
    }
  });

  it("rejects unauthenticated and invalid-filter exports without CSV data", async () => {
    const anonymous = await fetch(`${baseUrl}/api/scans/export`);
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get("content-type")).not.toContain("text/csv");
    const invalid = await fetch(`${baseUrl}/api/scans/export?risk=None`, { headers: { cookie } });
    expect(invalid.status).toBe(400);
  });

  it("exports only the owner's masked findings with neutralised formulas", async () => {
    const response = await fetch(`${baseUrl}/api/scans/export`, { headers: { cookie } });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const text = await response.text();
    for (const raw of RAW_SYNTHETIC_VALUES) expect(text).not.toContain(raw);
    const [header, ...rows] = csvRows(text);
    expect(header).toEqual(["Filename", "Date (UTC)", "Type", "Risk", "Count", "Masked example"]);
    expect(rows).toHaveLength(filterFindings(historyA.scans, "all", "all").length);
    const formulaRows = rows.filter((row) => row[0] === `'${formulaName}`);
    expect(formulaRows).toHaveLength(4);
    expect(rows.every((row) => !/^[=+\-@\t\r]/.test(row[0]) && !/^[=+\-@\t\r]/.test(row[5]))).toBe(true);

    const filtered = csvRows(await (await fetch(`${baseUrl}/api/scans/export?type=payment_card&risk=Critical`, { headers: { cookie } })).text());
    expect(filtered.length - 1).toBe(filterFindings(historyA.scans, "payment_card", "Critical").length);
    expect(filtered.slice(1).every((row) => row[2] === "Payment card" && row[3] === "Critical")).toBe(true);
  });

  it("excludes user A's scans from user B's export", async () => {
    const { cookies: bCookie } = await signInViaApp(
      requireEnv().MINIDSP_TEST_USER_B_EMAIL,
      requireEnv().MINIDSP_TEST_USER_B_PASSWORD,
    );
    const response = await fetch(`${baseUrl}/api/scans/export`, { headers: { cookie: bCookie } });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain(runId);
    const bRows = await allRows<{ id: string }>(b, "scan_findings", "id");
    expect(csvRows(text).length - 1).toBe(bRows.length);
  });
});

describe("Sidebar routes (REAL app, signed-in user A)", () => {
  it.each([
    ["/", "Dashboard"],
    ["/upload", "Upload"],
    ["/findings", "Findings"],
  ])("serves %s as its own page with one active sidebar item", async (path, label) => {
    const response = await fetch(`${baseUrl}${path}`, { headers: { cookie }, redirect: "manual" });
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).not.toMatch(/NEXT_REDIRECT;[^;]*;\/login/);
    expect(html).toContain(`<h1>${label}</h1>`);
    expect(html).toContain("Signed in as");
    const active = [...html.matchAll(/<a\s[^>]*aria-current="page"[^>]*>/g)].map((m) => m[0].match(/href="([^"]*)"/)?.[1]);
    // Streamed HTML can contain the loading.tsx fallback shell for the same route; it must mark the same item.
    expect(active.length).toBeGreaterThan(0);
    expect(new Set(active)).toEqual(new Set([path]));
    expect(html).not.toMatch(/href="\/#(dashboard|upload|findings)"/);
    for (const raw of RAW_SYNTHETIC_VALUES) expect(html).not.toContain(raw);
  });
});
