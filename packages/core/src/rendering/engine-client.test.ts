import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createEngineClient, type RenderProjection } from "./engine-client.js";

const sampleProjection = (): RenderProjection => ({
  header: {
    protocolVersion: 1,
    schemaId: "domdoc://render-wire/v1",
    requestId: "vitest-req",
    sessionId: "vitest-sess",
    documentGeneration: 3,
    units: "pt",
  },
  pages: [
    {
      pageIndex: 0,
      widthPt: 612,
      heightPt: 792,
      runs: [
        {
          runId: "run-a",
          text: "W0",
          xPt: 72,
          yPt: 720,
          fontSizePt: 12,
        },
      ],
    },
  ],
});

describe("engine client", () => {
  it("renders via in-process wasm", async () => {
    const client = await createEngineClient();
    const out = await client.render(sampleProjection());
    expect(out.header.requestId).toBe("vitest-req");
    expect(out.geometry.pages[0]?.runBounds.length).toBe(1);
    expect(out.paint.items.length).toBeGreaterThan(0);
    await client.dispose();
  });

  it("renders via worker thread", async () => {
    const workerUrl = new URL("./render-worker.ts", import.meta.url);
    const client = await createEngineClient({
      workerScript: workerUrl,
      workerOptions: { execArgv: ["--import", "tsx/esm"] },
    });
    const out = await client.render(sampleProjection());
    expect(out.header.documentGeneration).toBe(3);
    await client.dispose();
  });
});
