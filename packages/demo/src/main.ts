import init, * as engine from "@domdoc/demo-engine";
import {
  createCompositorInputState,
  pointerDownWithCaret,
} from "../../core/dist/compositor/input-hook.js";
import {
  beginComposition,
  commitComposition,
  updateCompositionPreedit,
} from "../../core/dist/editing/composition-stub.js";
import {
  afCorpusAllConverged,
  evaluateAfBrowserCorpus,
} from "../../core/dist/components/fragmentation-af-browser-corpus.js";
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
  const imeInput = document.getElementById("domdoc-ime-input");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("canvas missing");
  }
  if (!(imeInput instanceof HTMLInputElement)) {
    throw new Error("ime input missing");
  }
  document.body.dataset.compositorMounted = "true";
  const toolbar = document.getElementById("domdoc-toolbar");
  const sessionLabel = document.getElementById("domdoc-session-label");
  if (toolbar) {
    document.body.dataset.m2ToolbarShell = "stub";
    document.body.dataset.m2ToolbarSessionId = "demo-sess";
  }
  if (sessionLabel) {
    sessionLabel.textContent = "Session: demo-sess (M2 stub)";
    document.body.dataset.m2SessionLabel = sessionLabel.textContent;
    document.body.dataset.m2SessionId = "demo-sess";
  }

  const response = JSON.parse(
    engine.render_projection_json(JSON.stringify(sampleProjection())),
  ) as RenderWireResponse;
  document.body.dataset.engineReady = "true";
  document.body.dataset.paintItems = String(response.paint?.items?.length ?? 0);

  const runText = "domdoc";
  let input = createCompositorInputState(response);
  input = pointerDownWithCaret(input, { xPt: 80, yPt: 720 }, response, runText);
  document.body.dataset.inputHookReady = input.active ? "true" : "false";
  document.body.dataset.caretOffset = String(input.active?.caretOffset ?? 0);

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

  const afVerdicts = evaluateAfBrowserCorpus((payload) =>
    engine.layout_flow_paragraph_shaped_json(payload),
  );
  document.body.dataset.afCorpusCount = String(afVerdicts.length);
  document.body.dataset.afCorpusConverged = afCorpusAllConverged(afVerdicts) ? "true" : "false";

  let composition = input.active
    ? beginComposition(input.active, "")
    : null;

  imeInput.addEventListener("compositionstart", () => {
    if (!input.active) return;
    composition = beginComposition(input.active, "");
    document.body.dataset.compositionState = "active";
  });
  imeInput.addEventListener("compositionupdate", (event) => {
    if (!composition || !input.active) return;
    composition = updateCompositionPreedit(composition, event.data ?? "");
    document.body.dataset.compositionPreedit = composition.preedit;
  });
  imeInput.addEventListener("compositionend", (event) => {
    if (!composition || !input.active) return;
    composition = updateCompositionPreedit(composition, event.data ?? "");
    const committed = commitComposition(composition);
    input = { ...input, active: committed.region };
    document.body.dataset.compositionState = "committed";
    document.body.dataset.caretOffset = String(committed.region.caretOffset);
    document.body.dataset.compositionInserted = String(committed.insertedLength);
  });

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#eef2f7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "14px system-ui";
    ctx.fillText(`paint items: ${response.paint?.items?.length ?? 0}`, 16, 24);
    ctx.fillText(`caret: ${input.active?.caretOffset ?? 0}`, 16, 44);
  }
}

boot().catch((err) => {
  document.body.dataset.engineReady = "error";
  document.body.dataset.engineError = err instanceof Error ? err.message : String(err);
});
