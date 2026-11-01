// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { PageView } from "./engine-types.js";
import { placeMedia } from "./media-view.js";

function page(kind: "audio" | "video"): PageView {
  return {
    index: 0,
    widthPt: 640,
    heightPt: 320,
    content: { xPt: 36, yPt: 36, widthPt: 568, heightPt: 248 },
    rasterized: false,
    runs: [],
    highlights: [],
    embeds: [],
    objects: [{ id: "media", kind, xPt: 36, yPt: 36, widthPt: 568, heightPt: kind === "video" ? 240 : 72, rotation: 0, z: 1 }],
  };
}

describe("placeMedia", () => {
  it("mounts an audio element for an audio page object and a video element for video", () => {
    const pageEl = document.createElement("div");
    placeMedia(pageEl, page("audio"), "blob:track");
    const audio = pageEl.querySelector("audio");
    expect(audio).toBeTruthy();
    expect(audio?.controls).toBe(true);
    expect(audio?.getAttribute("src")).toBe("blob:track");
    expect(pageEl.dataset.media).toBe("audio");
    const stage = pageEl.querySelector<HTMLElement>(".dd-media")!;
    expect(stage.style.left).toBe("5.625%");

    placeMedia(pageEl, page("video"), "blob:film");
    expect(pageEl.querySelector("audio")).toBeNull();
    const video = pageEl.querySelector("video");
    expect(video?.getAttribute("src")).toBe("blob:film");
    expect(video?.hasAttribute("playsinline")).toBe(true);
    expect(pageEl.dataset.media).toBe("video");

    placeMedia(pageEl, { ...page("audio"), objects: [] }, "blob:track");
    expect(pageEl.querySelector(".dd-media")).toBeNull();
    expect(pageEl.dataset.media).toBeUndefined();
  });
});
