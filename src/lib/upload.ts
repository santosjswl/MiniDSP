export const MAX_UPLOAD_BYTES = 1_048_576;

export type UploadFileType = "csv" | "txt";

const CONTENT_TYPE_BY_FILE_TYPE: Record<UploadFileType, string> = {
  csv: "text/csv",
  txt: "text/plain",
};

export class UploadError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function parseFileName(header: string | null): {
  fileName: string;
  fileType: UploadFileType;
} {
  let decoded: string;
  try {
    decoded = decodeURIComponent(header ?? "");
  } catch {
    throw new UploadError(400, "invalid_filename", "The file name is invalid.");
  }

  const baseName = decoded.split(/[\\/]/).pop() ?? "";
  const fileName = baseName.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (fileName.length === 0 || fileName.length > 255) {
    throw new UploadError(400, "invalid_filename", "The file name is invalid.");
  }

  const extension = fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase();
  if (extension !== "csv" && extension !== "txt") {
    throw new UploadError(
      415,
      "unsupported_type",
      "Only .csv and .txt files are supported.",
    );
  }

  return { fileName, fileType: extension };
}

export function assertContentType(
  header: string | null,
  fileType: UploadFileType,
): void {
  const mediaType = header?.split(";")[0].trim().toLowerCase();
  if (mediaType !== CONTENT_TYPE_BY_FILE_TYPE[fileType]) {
    throw new UploadError(
      415,
      "unsupported_type",
      "The content type does not match a supported file type.",
    );
  }
}

export function assertDeclaredLength(header: string | null): void {
  if (header === null) return;
  const declared = Number(header);
  if (!Number.isFinite(declared) || declared < 0) {
    throw new UploadError(400, "invalid_request", "Invalid request length.");
  }
  if (declared > MAX_UPLOAD_BYTES) {
    throw new UploadError(413, "file_too_large", "The file exceeds 1 MiB.");
  }
}

export async function readBoundedBody(
  body: ReadableStream<Uint8Array> | null,
  maxBytes = MAX_UPLOAD_BYTES,
): Promise<Uint8Array> {
  if (!body) return new Uint8Array(0);

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new UploadError(413, "file_too_large", "The file exceeds 1 MiB.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function decodeUtf8Text(bytes: Uint8Array): string {
  if (bytes.byteLength === 0) {
    throw new UploadError(400, "empty_file", "The file is empty.");
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new UploadError(
      422,
      "invalid_encoding",
      "The file is not valid UTF-8 text.",
    );
  }

  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) {
    throw new UploadError(
      422,
      "binary_content",
      "The file appears to contain binary content.",
    );
  }
  return text;
}
