import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, rpc } = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser }, rpc })),
}));

import { POST } from "@/app/api/scans/route";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";

const RAW_VALUES = [
  "alex@example.test",
  "07700 900123",
  "AB 12 34 56 C",
  "4111 1111 1111 1111",
];
const SYNTHETIC = RAW_VALUES.join(",") + "\n";

function upload(
  body: BodyInit | null,
  {
    name = "synthetic.csv",
    type = "text/csv",
    headers = {},
  }: { name?: string | null; type?: string; headers?: Record<string, string> } = {},
) {
  const allHeaders: Record<string, string> = { "content-type": type, ...headers };
  if (name !== null) allHeaders["x-file-name"] = encodeURIComponent(name);
  return POST(
    new Request("http://localhost/api/scans", {
      method: "POST",
      headers: allHeaders,
      body,
    }),
  );
}

async function errorCode(response: Response) {
  return ((await response.json()) as { error: { code: string } }).error.code;
}

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-a" } } });
  rpc.mockReset().mockResolvedValue({ data: "scan-id", error: null });
});

describe("POST /api/scans (mocked Supabase)", () => {
  it("rejects unauthenticated requests without reading or saving", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await upload(SYNTHETIC);
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests", async () => {
    const response = await upload(SYNTHETIC, {
      headers: { origin: "https://attacker.example" },
    });
    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("allows the actual loopback host when Next normalizes the internal URL", async () => {
    const response = await upload(SYNTHETIC, {
      headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
    });
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledOnce();
  });

  it.each([
    ["empty file", new Uint8Array(0), {}, 400, "empty_file"],
    ["file one byte over the limit", new Uint8Array(MAX_UPLOAD_BYTES + 1).fill(97), {}, 413, "file_too_large"],
    ["oversized declared length", "a", { headers: { "content-length": String(MAX_UPLOAD_BYTES + 1) } }, 413, "file_too_large"],
    ["invalid UTF-8", new Uint8Array([0x41, 0xff, 0xfe, 0x42]), {}, 422, "invalid_encoding"],
    ["binary NUL content", new Uint8Array([0x41, 0x00, 0x42]), {}, 422, "binary_content"],
    ["unsupported extension", "a", { name: "payload.exe" }, 415, "unsupported_type"],
    ["text content disguised as PDF name", "a", { name: "report.pdf" }, 415, "unsupported_type"],
    ["mismatched content type", "a", { type: "application/pdf" }, 415, "unsupported_type"],
    ["CSV name with text/plain type", "a", { type: "text/plain" }, 415, "unsupported_type"],
    ["missing file name", "a", { name: null }, 400, "invalid_filename"],
  ] as const)("rejects %s without saving", async (_label, body, options, status, code) => {
    const response = await upload(body as BodyInit, options);
    expect(response.status).toBe(status);
    expect(await errorCode(response)).toBe(code);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["1 byte", 1],
    ["exactly 1 MiB", MAX_UPLOAD_BYTES],
  ])("accepts a %s file", async (_label, size) => {
    const response = await upload(new Uint8Array(size).fill(97));
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc.mock.calls[0][1].p_file_size_bytes).toBe(size);
  });

  it("accepts .txt with text/plain and a charset parameter", async () => {
    const response = await upload("clean", {
      name: "notes.TXT",
      type: "text/plain; charset=utf-8",
    });
    expect(response.status).toBe(201);
    expect(rpc.mock.calls[0][1].p_file_type).toBe("txt");
  });

  it("strips path components from untrusted file names", async () => {
    await upload("clean", { name: "../../etc/secret.csv" });
    expect(rpc.mock.calls[0][1].p_file_name).toBe("secret.csv");
  });

  it("returns and saves only masked aggregates", async () => {
    const response = await upload(SYNTHETIC);
    const bodyText = await response.text();
    const savedArgs = JSON.stringify(rpc.mock.calls[0][1]);

    expect(response.status).toBe(201);
    expect(JSON.parse(bodyText).scan.overallRisk).toBe("Critical");
    expect(JSON.parse(bodyText).scan.totalFindings).toBe(4);
    for (const raw of [...RAW_VALUES, "4111111111111111", "07700900123"]) {
      expect(bodyText).not.toContain(raw);
      expect(savedArgs).not.toContain(raw);
    }
  });

  it("returns a generic error when the database save fails", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'new row violates check constraint "scan_findings_masked_example_check"' },
    });
    const response = await upload(SYNTHETIC);
    const bodyText = await response.text();
    expect(response.status).toBe(500);
    expect(bodyText).toContain("save_failed");
    expect(bodyText).not.toContain("constraint");
  });
});
