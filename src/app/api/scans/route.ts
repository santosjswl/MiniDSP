import { NextResponse } from "next/server";
import { classifyContent } from "@/detection";
import { isSameOrigin, jsonError } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";
import { loadOwnerScans } from "@/lib/scan-history";
import { redactUnsafeExamples } from "@/lib/scans";
import {
  assertContentType,
  assertDeclaredLength,
  decodeUtf8Text,
  parseFileName,
  readBoundedBody,
  UploadError,
} from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonError(401, "unauthenticated", "Sign in to view your scans.");
    }

    const scans = await loadOwnerScans(supabase, user.id);
    if (!scans) {
      return jsonError(503, "history_unavailable", "Your scan history could not be loaded. Try again.");
    }

    return NextResponse.json(redactUnsafeExamples(scans), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return jsonError(503, "history_unavailable", "Your scan history could not be loaded. Try again.");
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "forbidden", "Cross-origin requests are not allowed.");
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return jsonError(503, "unavailable", "The service is not configured.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError(401, "unauthenticated", "Sign in to upload files.");
  }

  try {
    const { fileName, fileType } = parseFileName(
      request.headers.get("x-file-name"),
    );
    assertContentType(request.headers.get("content-type"), fileType);
    assertDeclaredLength(request.headers.get("content-length"));

    const bytes = await readBoundedBody(request.body);
    const result = classifyContent(decodeUtf8Text(bytes));

    const { data: scanId, error } = await supabase.rpc(
      "create_scan_with_findings",
      {
        p_file_name: fileName,
        p_file_type: fileType,
        p_file_size_bytes: bytes.byteLength,
        p_findings: result.findings,
      },
    );
    if (error || typeof scanId !== "string") {
      return jsonError(500, "save_failed", "The scan could not be saved.");
    }

    return NextResponse.json(
      {
        scan: {
          id: scanId,
          fileName,
          fileType,
          fileSizeBytes: bytes.byteLength,
          overallRisk: result.overallRisk,
          totalFindings: result.findings.reduce((sum, f) => sum + f.count, 0),
          findings: result.findings,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof UploadError) {
      return jsonError(error.status, error.code, error.message);
    }
    return jsonError(500, "scan_failed", "The file could not be scanned.");
  }
}
