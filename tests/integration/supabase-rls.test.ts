// REAL Supabase checks against the development project. Requires .env.local and the applied migration.
import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyContent } from "@/detection";
import {
  anonClient,
  RAW_SYNTHETIC_VALUES,
  signedInClient,
  SYNTHETIC_CONTENT,
} from "./helpers";

const runId = `it-${Date.now()}`;
let a: SupabaseClient;
let b: SupabaseClient;
let userAId: string;
let userBId: string;
let scanAId: string;

const findings = classifyContent(SYNTHETIC_CONTENT).findings;

beforeAll(async () => {
  ({ client: a, userId: userAId } = await signedInClient("A"));
  ({ client: b, userId: userBId } = await signedInClient("B"));
  expect(userAId).not.toBe(userBId);

  const { data, error } = await a.rpc("create_scan_with_findings", {
    p_file_name: `${runId}-a.csv`,
    p_file_type: "csv",
    p_file_size_bytes: SYNTHETIC_CONTENT.length,
    p_findings: findings,
  });
  expect(error).toBeNull();
  scanAId = data as string;
});

describe("Supabase RLS and atomic persistence (REAL dev database)", () => {
  it("lets user A read own scan with derived risk and totals", async () => {
    const { data, error } = await a
      .from("scans")
      .select("owner_id, overall_risk, total_findings, file_name")
      .eq("id", scanAId)
      .single();
    expect(error).toBeNull();
    expect(data).toMatchObject({
      owner_id: userAId,
      overall_risk: "Critical",
      total_findings: 5,
    });
  });

  it("lets user A read own findings, which contain only masked values", async () => {
    const { data, error } = await a
      .from("scan_findings")
      .select("*")
      .eq("scan_id", scanAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(4);
    const serialized = JSON.stringify(data);
    for (const raw of RAW_SYNTHETIC_VALUES) expect(serialized).not.toContain(raw);
    expect(data?.find((row) => row.finding_type === "email")?.match_count).toBe(2);
  });

  it("hides user A's scan and findings from user B", async () => {
    const scans = await b.from("scans").select("id").eq("id", scanAId);
    const rows = await b.from("scan_findings").select("id").eq("scan_id", scanAId);
    expect(scans.error).toBeNull();
    expect(scans.data).toEqual([]);
    expect(rows.error).toBeNull();
    expect(rows.data).toEqual([]);

    const all = await b.from("scans").select("owner_id");
    expect(all.data?.every((row) => row.owner_id === userBId)).toBe(true);
  });

  it.each([
    ["B's own owner id", () => userBId],
    ["A's owner id", () => userAId],
    ["default owner id", () => undefined],
  ])("denies user B attaching a finding to A's scan using %s", async (_label, owner) => {
    const ownerId = owner();
    const row: Record<string, unknown> = {
      scan_id: scanAId,
      finding_type: "uk_phone",
      risk: "Medium",
      match_count: 1,
      masked_example: "07******999",
    };
    if (ownerId) row.owner_id = ownerId;
    const { error } = await b.from("scan_findings").insert(row);
    expect(error).not.toBeNull();

    const check = await a
      .from("scan_findings")
      .select("finding_type")
      .eq("scan_id", scanAId);
    expect(check.data).toHaveLength(4);
  });

  it("denies user B creating a scan owned by user A", async () => {
    const { error } = await b.from("scans").insert({
      owner_id: userAId,
      file_name: `${runId}-forged.csv`,
      file_type: "csv",
      file_size_bytes: 1,
      overall_risk: "None",
      total_findings: 0,
    });
    expect(error).not.toBeNull();
  });

  it("denies updates and deletes (no privilege granted)", async () => {
    const update = await b.from("scans").update({ file_name: "x.csv" }).eq("id", scanAId);
    const remove = await b.from("scans").delete().eq("id", scanAId);
    const ownUpdate = await a.from("scans").update({ file_name: "x.csv" }).eq("id", scanAId);
    expect(update.error).not.toBeNull();
    expect(remove.error).not.toBeNull();
    expect(ownUpdate.error).not.toBeNull();

    const check = await a.from("scans").select("file_name").eq("id", scanAId).single();
    expect(check.data?.file_name).toBe(`${runId}-a.csv`);
  });

  it("denies anonymous reads and the save function", async () => {
    const anon = anonClient();
    const read = await anon.from("scans").select("id").limit(1);
    const save = await anon.rpc("create_scan_with_findings", {
      p_file_name: `${runId}-anon.csv`,
      p_file_type: "csv",
      p_file_size_bytes: 1,
      p_findings: [],
    });
    expect(read.data ?? []).toEqual([]);
    expect(read.error).not.toBeNull();
    expect(save.error).not.toBeNull();
  });

  it("rolls back the scan when a finding write fails", async () => {
    const fileName = `${runId}-rollback.csv`;
    const { error } = await a.rpc("create_scan_with_findings", {
      p_file_name: fileName,
      p_file_type: "csv",
      p_file_size_bytes: 10,
      p_findings: [
        findings[0],
        { type: "uk_phone", risk: "Medium", count: 1, maskedExample: "UNMASKED" },
      ],
    });
    expect(error).not.toBeNull();

    const { data } = await a.from("scans").select("id").eq("file_name", fileName);
    expect(data).toEqual([]);
  });

  it("rejects a raw or incorrectly masked example at the database boundary", async () => {
    const fileName = `${runId}-unmasked.csv`;
    const { error } = await a.rpc("create_scan_with_findings", {
      p_file_name: fileName,
      p_file_type: "csv",
      p_file_size_bytes: 10,
      p_findings: [
        {
          type: "email",
          risk: "Low",
          count: 1,
          maskedExample: "alex@example.test*",
        },
      ],
    });
    expect(error).not.toBeNull();

    const { data } = await a.from("scans").select("id").eq("file_name", fileName);
    expect(data).toEqual([]);
  });
});
