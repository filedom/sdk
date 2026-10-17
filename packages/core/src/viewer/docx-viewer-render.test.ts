import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildDocxRenderProjectionFromStore } from "./docx-render-projection.js";
import { openDocxProsemirrorDemoSessionSlice } from "../session/docx-prosemirror-demo-session-slice.js";
import { createEngineClient } from "../rendering/engine-client.js";

const sessionStub = {
  documentId: "viewer-test",
  kind: "flow" as const,
  revisions: {
    committedRevision: 0,
    persistedRevision: 0,
    materializedRevision: 0,
    exportedRevision: 0,
    sharedRevision: null,
    renderedRevision: 0,
  },
};

describe("DOCX viewer render pipeline", () => {
  it("builds projection and WASM paint items for e2e minimal-open.docx", async () => {
    const wasm = await import("domdoc-wasm");
    const fixturePath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../../e2e/fixtures/minimal-open.docx",
    );
    const bytes = readFileSync(fixturePath);
    const slice = openDocxProsemirrorDemoSessionSlice(new Uint8Array(bytes), sessionStub);
    const projection = buildDocxRenderProjectionFromStore({
      store: slice.store,
      engine: wasm,
      sessionId: sessionStub.documentId,
      documentGeneration: 0,
    });
    expect(projection.pages[0]?.runs.length ?? 0).toBeGreaterThan(0);

    const client = await createEngineClient();
    const response = await client.render(projection);
    expect(response.paint.items.length).toBeGreaterThan(0);
    expect(response.paint.items.some((item) => item.kind === "glyphRun")).toBe(true);
    await client.dispose();
  });
});
