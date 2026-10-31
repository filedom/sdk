/** Engine and SDK failures. Engine errors arrive as `"code: detail"` messages. */
export class DomdocError extends Error {
  constructor(
    readonly code: string,
    readonly detail: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "DomdocError";
  }

  static from(error: unknown): DomdocError {
    if (error instanceof DomdocError) return error;
    const message = error instanceof Error ? error.message : String(error);
    const match = /^([a-z][a-z0-9-]*): ?([\s\S]*)$/.exec(message);
    const wrapped = match ? new DomdocError(match[1]!, match[2]!) : new DomdocError("engine", message);
    if (error instanceof Error && error.stack) wrapped.stack = error.stack;
    return wrapped;
  }
}
