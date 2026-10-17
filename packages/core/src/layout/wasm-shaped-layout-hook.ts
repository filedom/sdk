import type { ShapedLayoutJsonFn } from "../components/fragmentation-af-browser-corpus.js";
import type { AfIncrementalEnginePath } from "../components/fragmentation-af-incremental-authoritative.js";

/** W2-G4-09: WASM layout exports with optional incremental continuation API. */
export interface WasmLayoutEngineExports {
  layout_flow_paragraph_shaped_json: (input: string) => string;
  layout_flow_paragraph_incremental_json?: (input: string) => string;
}

export interface WasmShapedLayoutHook {
  shapedLayoutJson: ShapedLayoutJsonFn;
  incrementalEnginePath: AfIncrementalEnginePath;
  layoutIncrementalAtBreak?: (paragraphPayload: string, breakAfterCharIndex: number) => string;
}

export function createWasmShapedLayoutHook(exports: WasmLayoutEngineExports): WasmShapedLayoutHook {
  const shapedLayoutJson: ShapedLayoutJsonFn = (payload) =>
    String(exports.layout_flow_paragraph_shaped_json(payload));

  if (typeof exports.layout_flow_paragraph_incremental_json !== "function") {
    return { shapedLayoutJson, incrementalEnginePath: "unavailable" };
  }

  const layoutIncrementalAtBreak = (paragraphPayload: string, breakAfterCharIndex: number) => {
    const paragraph = JSON.parse(paragraphPayload) as Record<string, unknown>;
    const incrementalPayload = JSON.stringify({
      paragraph,
      breakAfterCharIndex,
    });
    return String(exports.layout_flow_paragraph_incremental_json!(incrementalPayload));
  };

  return {
    shapedLayoutJson,
    incrementalEnginePath: "engine-sketch",
    layoutIncrementalAtBreak,
  };
}
