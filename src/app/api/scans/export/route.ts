import type { FindingType, Risk } from "@/detection";
import { findingsToCsv } from "@/lib/csv";
import { jsonError } from "@/lib/http";
import { loadOwnerScans } from "@/lib/scan-history";
import { redactUnsafeExamples, TYPE_LABELS } from "@/lib/scans";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_RISKS = new Set(["all", "Low", "Medium", "High", "Critical"]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const type = params.get("type") ?? "all";
  const risk = params.get("risk") ?? "all";
  if ((type !== "all" && !Object.hasOwn(TYPE_LABELS, type)) || !EXPORT_RISKS.has(risk)) {
    return jsonError(400, "invalid_filter", "Choose a supported finding type and risk.");
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonError(401, "unauthenticated", "Sign in to export your findings.");
    }
    const scans = await loadOwnerScans(supabase, user.id);
    if (!scans) {
      return jsonError(503, "export_unavailable", "Your findings could not be exported. Try again.");
    }
    const csv = findingsToCsv(
      redactUnsafeExamples(scans).scans,
      type as FindingType | "all",
      risk as Exclude<Risk, "None"> | "all",
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="minidsp-findings.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return jsonError(503, "export_unavailable", "Your findings could not be exported. Try again.");
  }
}
