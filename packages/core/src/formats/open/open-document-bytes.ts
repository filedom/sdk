import { detectDocumentKind, type DocumentKindDetection } from "./detect-document-kind.js";

export interface OpenDocumentProgress {
  loaded: number;
  total: number | null;
}

export interface OpenDocumentResult {
  bytes: Uint8Array;
  detection: DocumentKindDetection;
  cancelled: boolean;
}

export interface OpenDocumentFromUrlOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  onProgress?: (progress: OpenDocumentProgress) => void;
  hint?: { mime?: string; filename?: string };
}

/** F01: open from in-memory bytes/Blob with format detection. */
export function openDocumentFromBytes(
  bytes: Uint8Array,
  hint?: { mime?: string; filename?: string },
): OpenDocumentResult {
  return {
    bytes,
    detection: detectDocumentKind(bytes, hint),
    cancelled: false,
  };
}

export async function openDocumentFromBlob(
  blob: Blob,
  hint?: { mime?: string; filename?: string },
  signal?: AbortSignal,
): Promise<OpenDocumentResult> {
  if (signal?.aborted) {
    return {
      bytes: new Uint8Array(),
      detection: detectDocumentKind(new Uint8Array(), hint),
      cancelled: true,
    };
  }
  const buffer = await blob.arrayBuffer();
  if (signal?.aborted) {
    return {
      bytes: new Uint8Array(),
      detection: detectDocumentKind(new Uint8Array(), hint),
      cancelled: true,
    };
  }
  const bytes = new Uint8Array(buffer);
  return openDocumentFromBytes(bytes, {
    mime: hint?.mime ?? blob.type,
    filename: hint?.filename,
  });
}

/** F01: host-supplied URL fetch with cancellation/progress (no range loading). */
export async function openDocumentFromUrl(
  url: string,
  options: OpenDocumentFromUrlOptions = {},
): Promise<OpenDocumentResult> {
  if (options.signal?.aborted) {
    return {
      bytes: new Uint8Array(),
      detection: detectDocumentKind(new Uint8Array(), options.hint),
      cancelled: true,
    };
  }
  const response = await fetch(url, { signal: options.signal, headers: options.headers });
  if (!response.ok) {
    throw new Error(`open-url-failed:${response.status}`);
  }
  const totalHeader = response.headers.get("content-length");
  const total = totalHeader ? Number(totalHeader) : null;
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return openDocumentFromBytes(bytes, options.hint);
  }
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    if (options.signal?.aborted) {
      await reader.cancel();
      return {
        bytes: new Uint8Array(),
        detection: detectDocumentKind(new Uint8Array(), options.hint),
        cancelled: true,
      };
    }
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      options.onProgress?.({ loaded, total });
    }
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return openDocumentFromBytes(bytes, options.hint);
}
