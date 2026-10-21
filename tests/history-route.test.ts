import { beforeEach, describe, expect, it, vi } from "vitest";
import { scanFixture } from "./ui-fixtures";

const { getUser, from, query, createClient } = vi.hoisted(() => {
  const query = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), returns: vi.fn(),
  };
  return { getUser: vi.fn(), from: vi.fn(), query, createClient: vi.fn() };
});
vi.mock("@/lib/supabase/server", () => ({ createClient }));
import { GET } from "@/app/api/scans/route";

beforeEach(() => {
  vi.resetAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
  from.mockReturnValue(query);
  for (const name of ["select", "eq", "order", "range"] as const) query[name].mockReturnValue(query);
  query.returns.mockResolvedValue({ data: [scanFixture()], error: null });
  createClient.mockResolvedValue({ auth: { getUser }, from });
});

describe("GET /api/scans (mocked Supabase)", () => {
  it("rejects unauthenticated users without querying data", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET()).status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("scopes data to the verified owner, excludes owner credentials and disables caching", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith("owner_id", "user-a");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).scans[0].total_findings).toBe(3);
  });

  it("reads beyond the database page limit instead of displaying incomplete totals", async () => {
    query.returns
      .mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => scanFixture({ id: String(i) })), error: null })
      .mockResolvedValueOnce({ data: [scanFixture()], error: null });
    const body = await (await GET()).json();
    expect(body.scans).toHaveLength(501);
    expect(query.range.mock.calls).toEqual([[0, 499], [500, 999]]);
    expect(query.eq).toHaveBeenCalledTimes(2);
  });

  it("withholds invalid stored examples and returns an explicit warning count", async () => {
    const scan = scanFixture();
    scan.scan_findings[0].masked_example = "alex@example.test*";
    query.returns.mockResolvedValue({ data: [scan], error: null });
    const response = await GET();
    const text = await response.text();
    expect(text).not.toContain("alex@example.test");
    expect(JSON.parse(text).redactedExamples).toBe(1);
  });

  it("returns a safe error, not empty success or database internals, when any page fails", async () => {
    query.returns.mockResolvedValue({ data: null, error: { message: "private database detail" } });
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain("history_unavailable");
    expect(body).not.toContain("private database detail");
  });

  it("reports unavailable configuration explicitly", async () => {
    createClient.mockRejectedValue(new Error("private config detail"));
    expect((await GET()).status).toBe(503);
  });
});
