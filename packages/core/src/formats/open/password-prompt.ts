/** F03 password prompt contract — never logs the secret; decrypt is not implemented. */

export interface PasswordPromptRequest {
  documentKind: "pdf" | "docx" | "unknown";
  attempt: number;
  maxAttempts: number;
}

export interface PasswordPromptResult {
  cancelled: boolean;
  retry: boolean;
  /** Present only in-memory for the active attempt; callers must not persist. */
  password?: string;
}

export function createPasswordPromptState(
  request: PasswordPromptRequest,
  supplied?: string,
): PasswordPromptResult {
  if (request.attempt > request.maxAttempts) {
    return { cancelled: true, retry: false };
  }
  if (supplied === undefined) {
    return { cancelled: true, retry: false };
  }
  return { cancelled: false, retry: request.attempt < request.maxAttempts, password: supplied };
}

export function redactPasswordFromLog(record: Record<string, unknown>): Record<string, unknown> {
  const next = { ...record };
  for (const key of Object.keys(next)) {
    if (/pass(word|phrase)|secret|credential/i.test(key)) {
      next[key] = "[redacted]";
    }
  }
  return next;
}
