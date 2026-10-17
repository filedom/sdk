import type { PaintItem, RenderWireResponse } from "./generated-response.js";

/** WASM JSON may emit snake_case paint fields; normalize to generated wire types. */
export function normalizeRenderWireResponse(raw: RenderWireResponse): RenderWireResponse {
  return {
    ...raw,
    paint: {
      items: raw.paint.items.map(normalizePaintItem),
    },
  };
}

function normalizePaintItem(item: PaintItem | Record<string, unknown>): PaintItem {
  const kind = item.kind;
  if (kind === "fillRect") {
    const pageIndex = numberField(item, "pageIndex", "page_index") ?? 0;
    const colorRaw = (item as Record<string, unknown>).colorRgba ??
      (item as Record<string, unknown>).color_rgba;
    if (!Array.isArray(colorRaw) || colorRaw.length < 4) {
      throw new Error("render-wire-fillRect-missing-color");
    }
    return {
      kind: "fillRect",
      pageIndex,
      rect: (item as PaintItem & { kind: "fillRect" }).rect,
      colorRgba: [colorRaw[0], colorRaw[1], colorRaw[2], colorRaw[3]] as [
        number,
        number,
        number,
        number,
      ],
    };
  }
  if (kind === "glyphRun") {
    const pageIndex = numberField(item, "pageIndex", "page_index") ?? 0;
    const runId = stringField(item, "runId", "run_id");
    if (!runId) throw new Error("render-wire-glyphRun-missing-runId");
    return {
      kind: "glyphRun",
      pageIndex,
      runId,
      glyphs: (item as PaintItem & { kind: "glyphRun" }).glyphs,
    };
  }
  throw new Error(`render-wire-unknown-paint-item:${String(kind)}`);
}

function numberField(
  item: Record<string, unknown>,
  camel: string,
  snake: string,
): number | undefined {
  const value = item[camel] ?? item[snake];
  return typeof value === "number" ? value : undefined;
}

function stringField(
  item: Record<string, unknown>,
  camel: string,
  snake: string,
): string | undefined {
  const value = item[camel] ?? item[snake];
  return typeof value === "string" ? value : undefined;
}
