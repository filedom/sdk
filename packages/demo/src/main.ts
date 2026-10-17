import init, * as engine from "../../../../domdoc-wasm/pkg/domdoc_engine.js";
import {
  createCompositorInputState,
  pointerDown,
} from "../../core/dist/compositor/input-hook.js";
import type { RenderWireResponse } from "../../core/dist/wire/generated-response.js";

const sampleProjection = () => ({
  header: {
    protocolVersion: 1,
    schemaId: "domdoc://render-wire/v1",
    requestId: "demo-req",
    sessionId: "demo-sess",
    documentGeneration: 1,
    units: "pt",
  },
  pages: [
    {
      pageIndex: 0,
      widthPt: 612,
      heightPt: 792,
      runs: [
        {
          runId: "run-demo",
          text: "domdoc",
          xPt: 72,
          yPt: 720,
          fontSizePt: 12,
        },
      ],
    },
  ],
});

async function boot(): Promise<void> {
  await init();
  const canvas = document.getElementById("domdoc-canvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("canvas missing");
  }
  document.body.dataset.compositorMounted = "true";

  const response = JSON.parse(
    engine.render_projection_json(JSON.stringify(sampleProjection())),
  ) as RenderWireResponse;
  document.body.dataset.engineReady = "true";
  document.body.dataset.paintItems = String(response.paint?.items?.length ?? 0);

  let input = createCompositorInputState(response);
  input = pointerDown(input, { xPt: 80, yPt: 80 });
  document.body.dataset.inputHookReady = input.active ? "true" : "false";

  const layoutInput = {
    paragraph_id: "demo-p",
    text: "layout stability probe",
    max_width_pt: 180,
    font_size_pt: 12,
  };
  const passA = engine.layout_flow_paragraph_shaped_json(JSON.stringify(layoutInput));
  const passB = engine.layout_flow_paragraph_shaped_json(JSON.stringify(layoutInput));
  document.body.dataset.layoutStable = passA === passB ? "true" : "false";
  document.body.dataset.shapingBackend = engine.layout_shaping_backend_id();

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#eef2f7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "14px system-ui";
    ctx.fillText(`paint items: ${response.paint?.items?.length ?? 0}`, 16, 24);
  }
}

boot().catch((err) => {
  document.body.dataset.engineReady = "error";
  document.body.dataset.engineError = err instanceof Error ? err.message : String(err);
});
