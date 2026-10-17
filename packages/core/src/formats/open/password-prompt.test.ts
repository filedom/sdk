import { describe, expect, it } from "vitest";
import { createPasswordPromptState, redactPasswordFromLog } from "./password-prompt.js";

describe("F03 password prompt contract", () => {
  it("does not persist cancelled attempts and redacts secrets from logs", () => {
    expect(createPasswordPromptState({ documentKind: "pdf", attempt: 1, maxAttempts: 3 })).toEqual({
      cancelled: true,
      retry: false,
    });
    const ok = createPasswordPromptState(
      { documentKind: "pdf", attempt: 1, maxAttempts: 3 },
      "secret",
    );
    expect(ok.password).toBe("secret");
    expect(redactPasswordFromLog({ password: "secret", file: "a.pdf" })).toEqual({
      password: "[redacted]",
      file: "a.pdf",
    });
  });
});
