/** Engine and SDK failures. Engine errors arrive as `"code: detail"` messages. */
export class FiledomError extends Error {
  constructor(
    readonly code: string,
    readonly detail: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "FiledomError";
  }

  static from(error: unknown): FiledomError {
    if (error instanceof FiledomError) return error;
    const message = error instanceof Error ? error.message : String(error);
    const match = /^([a-z][a-z0-9-]*): ?([\s\S]*)$/.exec(message);
    const wrapped = match ? new FiledomError(match[1]!, match[2]!) : new FiledomError("engine", message);
    if (error instanceof Error && error.stack) wrapped.stack = error.stack;
    return wrapped;
  }
}
