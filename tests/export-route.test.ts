import { beforeEach, describe, expect, it, vi } from "vitest";
import { scanFixture } from "./ui-fixtures";

const { getUser, from, query, createClient } = vi.hoisted(() => {
  const query = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), returns: vi.fn(),
  };
  return { getUser: vi.fn(), from: vi.fn(), query, createClient: vi.fn() };
});
vi.mock("@/lib/supabase/server", () => ({ createClient }));
import { GET } from "@/app/api/scans/export/route";

const url = (search = "") => new Request(`http://127.0.0.1:3000/api/scans/export${search}`);

beforeEach(() => {
  vi.resetAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
  from.mockReturnValue(query);
  for (const name of ["select", "eq", "order", "range"] as const) query[name].mockReturnValue(query);
  query.returns.mockResolvedValue({ data: [scanFixture()], error: null });
  createClient.mockResolvedValue({ auth: { getUser }, from });
});

describe("GET /api/scans/export (mocked Supabase)", () => {
  it("rejects unauthenticated users without querying data", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await GET(url());
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).not.toContain("text/csv");
    expect(from).not.toHaveBeenCalled();
  });

  it("downloads owner-scoped, masked CSV with safe headers", async () => {
    const response = await GET(url());
    expect(response.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith("owner_id", "user-a");
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="minidsp-findings.csv"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = await response.text();
    expect(body.split("\r\n")[0]).toBe('"Filename","Date (UTC)","Type","Risk","Count","Masked example"');
    expect(body).toContain('"a***@example.test"');
  });

  it("applies the same type and risk filters as the findings view", async () => {
    const body = await (await GET(url("?type=payment_card&risk=Critical"))).text();
    expect(body).toContain("************1111");
    expect(body).not.toContain("a***@example.test");
  });

  it.each(["?type=toString", "?type=ssn", "?risk=None", "?risk=critical"])("rejects unsupported filter %s before reading data", async (search) => {
    const response = await GET(url(search));
    expect(response.status).toBe(400);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("withholds malformed stored examples and neutralises a formula filename", async () => {
    const scan = scanFixture({ file_name: "=HYPERLINK(\"http://x.test\").csv" });
    scan.scan_findings[0].masked_example = "alex@example.test*";
    query.returns.mockResolvedValue({ data: [scan], error: null });
    const body = await (await GET(url())).text();
    expect(body).not.toContain("alex@example.test");
    expect(body).toContain("Example withheld: invalid stored mask");
    expect(body).toContain("\"'=HYPERLINK(");
    expect(body).not.toMatch(/(^|,)"=/m);
  });

  it("returns a safe error, never partial CSV, when a page fails", async () => {
    query.returns.mockResolvedValue({ data: null, error: { message: "private database detail" } });
    const response = await GET(url());
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain("export_unavailable");
    expect(body).not.toContain("private database detail");
  });

  it("reports unavailable configuration explicitly", async () => {
    createClient.mockRejectedValue(new Error("private config detail"));
    const response = await GET(url());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private config detail");
  });
});
