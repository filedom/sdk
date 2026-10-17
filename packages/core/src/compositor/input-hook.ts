import type { RenderWireResponse } from "../wire/generated-response.js";
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
  const hit = hitTest(state.targets, point);
  if (!hit) {
    return { ...state, active: null };
  }
  return {
    ...state,
    active: activateRegionFromHit(hit),
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
