import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoredScan } from "@/lib/scans";

const PAGE_SIZE = 500;

/** Loads every scan owned by `ownerId`; returns null on any page failure so callers never show partial data. */
export async function loadOwnerScans(supabase: SupabaseClient, ownerId: string): Promise<StoredScan[] | null> {
  const scans: StoredScan[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("scans")
      .select("id,file_name,file_type,file_size_bytes,overall_risk,total_findings,created_at,scan_findings(id,finding_type,risk,match_count,masked_example)")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
      .returns<StoredScan[]>();
    if (error || !data) return null;
    scans.push(...data);
    if (data.length < PAGE_SIZE) return scans;
  }
}
