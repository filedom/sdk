import type { TrackChangesBinding } from "../modules.js";

/** Revisions are already inside the domdoc session. This module only marks that the host asked for them. */
export default async function initTrack(): Promise<void> {}

export function attach(_binding: TrackChangesBinding): void {}
