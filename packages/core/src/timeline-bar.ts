import type { ClipView, TimelineView } from "./engine-types.js";

export interface TimelineBarActions {
  select(id: string): void;
  trim(id: string, startMs: number, endMs: number): void;
}

/** Draws one track of clips. Dragging an edge trims that clip. */
export function renderTimeline(
  host: HTMLElement,
  timeline: TimelineView | undefined,
  activeId: string | undefined,
  actions: TimelineBarActions,
): void {
  host.replaceChildren();
  const track = timeline?.tracks[0];
  if (!timeline || !track || track.clips.length === 0) return;
  const doc = host.ownerDocument;
  const row = doc.createElement("div");
  row.className = "dd-track";
  row.dataset.track = track.id;
  const equal = timeline.durationMs <= 0 || track.clips.every((_, index) => clipSpan(track.clips, index, timeline.durationMs) <= 0);
  track.clips.forEach((clip, index) => {
    const el = doc.createElement("div");
    el.className = "dd-clip";
    el.dataset.clip = clip.id;
    if (clip.id === (activeId ?? track.clips[0]?.id)) el.dataset.active = "";
    const span = clipSpan(track.clips, index, timeline.durationMs);
    if (equal) {
      el.style.left = `${(index / track.clips.length) * 100}%`;
      el.style.width = `${100 / track.clips.length}%`;
    } else {
      el.style.left = `${(clip.startMs / timeline.durationMs) * 100}%`;
      el.style.width = `${Math.max((span / timeline.durationMs) * 100, 2)}%`;
    }
    const start = edge(doc, "start", clip.name);
    const name = doc.createElement("span");
    name.className = "dd-clip-name";
    name.textContent = clip.name;
    const end = edge(doc, "end", clip.name);
    el.append(start, name, end);
    el.addEventListener("pointerdown", (event) => {
      if ((event.target as Element | null)?.closest(".dd-clip-edge")) return;
      actions.select(clip.id);
    });
    bindEdge(start, "start", el, clip, span, actions);
    bindEdge(end, "end", el, clip, span, actions);
    row.append(el);
  });
  host.append(row);
}

function edge(doc: Document, side: "start" | "end", name: string): HTMLButtonElement {
  const button = doc.createElement("button");
  button.type = "button";
  button.className = "dd-clip-edge";
  button.dataset.edge = side;
  button.setAttribute("aria-label", side === "start" ? `Trim start of ${name}` : `Trim end of ${name}`);
  return button;
}

function clipSpan(clips: ClipView[], index: number, durationMs: number): number {
  const clip = clips[index];
  if (!clip) return 0;
  const next = clips[index + 1];
  if (next) return Math.max(0, next.startMs - clip.startMs);
  return Math.max(0, durationMs - clip.startMs);
}

function bindEdge(
  handle: HTMLButtonElement,
  side: "start" | "end",
  clipEl: HTMLElement,
  clip: ClipView,
  spanMs: number,
  actions: TimelineBarActions,
): void {
  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const width = clipEl.getBoundingClientRect().width || 1;
    const origin = event.clientX;
    const speed = clip.speed > 0 ? clip.speed : 1;
    const sourceOut = clip.outMs > clip.inMs ? clip.outMs : clip.inMs + Math.max(spanMs, 1) * speed;
    const move = (ev: PointerEvent) => {
      const delta = ((ev.clientX - origin) / width) * Math.max(spanMs, 1);
      let inMs = clip.inMs;
      let outMs = sourceOut;
      if (side === "end") outMs = Math.round(sourceOut + delta * speed);
      else inMs = Math.max(0, Math.round(clip.inMs + delta * speed));
      if (outMs < inMs + 50) return;
      const parent = clipEl.parentElement;
      if (!parent) return;
      const total = Math.max(spanMs, 1) * (clipEl.parentElement?.children.length ?? 1);
      const shown = (outMs - inMs) / speed;
      clipEl.style.width = `${Math.max((shown / total) * 100, 2)}%`;
    };
    const up = (ev: PointerEvent) => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      const delta = ((ev.clientX - origin) / width) * Math.max(spanMs, 1);
      if (Math.abs(delta) < 1) return;
      let inMs = clip.inMs;
      let outMs = sourceOut;
      if (side === "end") outMs = Math.round(sourceOut + delta * speed);
      else inMs = Math.max(0, Math.round(clip.inMs + delta * speed));
      if (outMs < inMs + 50) outMs = inMs + 50;
      actions.trim(clip.id, inMs, outMs);
    };
    handle.setPointerCapture?.(event.pointerId);
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });
}
