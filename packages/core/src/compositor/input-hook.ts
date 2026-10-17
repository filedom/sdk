import type { RenderWireResponse } from "../wire/generated-response.js";
import { caretOffsetFromGeometry } from "../editing/caret-map.js";
import {
  hitTargetsFromGeometry,
  hitTest,
  type HitTarget,
  type PointPt,
} from "../editing/geometry-map.js";
import {
  activateRegionFromHit,
  rebindRegionAfterGeometry,
  type InputRegionState,
} from "../editing/input-region.js";

export interface CompositorInputState {
  targets: HitTarget[];
  active: InputRegionState | null;
}

export function createCompositorInputState(
  response: RenderWireResponse,
): CompositorInputState {
  return {
    targets: hitTargetsFromGeometry(response.geometry),
    active: null,
  };
}

export function pointerDown(
  state: CompositorInputState,
  point: PointPt,
): CompositorInputState {
  return pointerDownWithCaret(state, point, undefined, "");
}

export function pointerDownWithCaret(
  state: CompositorInputState,
  point: PointPt,
  response: RenderWireResponse | undefined,
  runText: string,
): CompositorInputState {
  const hit = hitTest(state.targets, point);
  if (!hit) {
    return { ...state, active: null };
  }
  const caretOffset =
    response != null
      ? caretOffsetFromGeometry(response, hit, point, runText)
      : 0;
  return {
    ...state,
    active: activateRegionFromHit(hit, caretOffset),
  };
}

export function onGeometryUpdated(
  state: CompositorInputState,
  response: RenderWireResponse,
): CompositorInputState {
  const targets = hitTargetsFromGeometry(response.geometry);
  const active = rebindRegionAfterGeometry(state.active, targets);
  return { targets, active };
}
