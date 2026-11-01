import type { PageView } from "./engine-types.js";

/** Mounts the audio or video element for a page object of that kind. */
export function placeMedia(page: HTMLElement, view: PageView, url: string | undefined): void {
  const box = view.objects?.find((obj) => obj.kind === "audio" || obj.kind === "video");
  const existing = [...page.children].find((el): el is HTMLElement => el.classList.contains("dd-media"));
  if (!box || !url || view.widthPt <= 0 || view.heightPt <= 0) {
    existing?.remove();
    delete page.dataset.media;
    return;
  }
  const doc = page.ownerDocument;
  const stage = existing ?? doc.createElement("div");
  stage.className = "dd-media";
  stage.style.left = `${(box.xPt / view.widthPt) * 100}%`;
  stage.style.top = `${(box.yPt / view.heightPt) * 100}%`;
  stage.style.width = `${(box.widthPt / view.widthPt) * 100}%`;
  stage.style.height = `${(box.heightPt / view.heightPt) * 100}%`;
  const tag = box.kind === "video" ? "video" : "audio";
  let media = stage.querySelector(tag);
  if (!media) {
    stage.replaceChildren();
    const pick = doc.createElement("button");
    pick.type = "button";
    pick.className = "dd-media-pick";
    pick.textContent = "Select";
    pick.setAttribute("aria-label", "Select player");
    media = doc.createElement(tag);
    if (media instanceof HTMLMediaElement) {
      media.controls = true;
      media.preload = "metadata";
    }
    if (tag === "video") media.setAttribute("playsinline", "");
    stage.append(pick, media);
  }
  if (media instanceof HTMLMediaElement && media.getAttribute("src") !== url) media.src = url;
  if (!stage.parentElement) page.append(stage);
  page.dataset.media = box.kind;
}
