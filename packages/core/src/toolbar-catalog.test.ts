import { describe, expect, it } from "vitest";
import type { Capabilities, FileKind, Format } from "./engine-types.js";
import {
  actionAvailability,
  actionHint,
  groupAvailability,
  TOOLBAR_CATALOG,
  TRAY_CATALOG,
  type CatalogContext,
} from "./toolbar-catalog.js";

const caps = (partial: Partial<Capabilities> = {}): Capabilities => ({
  editText: false,
  editStructure: false,
  formatText: false,
  formatParagraph: false,
  flowEmbeds: false,
  transform: false,
  layers: false,
  insert: false,
  ...partial,
});

function ctx(partial: Partial<CatalogContext> = {}): CatalogContext {
  return {
    capabilities: caps(),
    mode: "live",
    selection: "none",
    ...partial,
  };
}

describe("toolbar catalog", () => {
  it("lists app and contextual groups with hints", () => {
    expect(TOOLBAR_CATALOG.some((g) => g.id === "file" && g.row === "app")).toBe(true);
    expect(TOOLBAR_CATALOG.some((g) => g.id === "text" && g.row === "contextual")).toBe(true);
    expect(TRAY_CATALOG.map((tray) => tray.id)).toEqual(["comments", "history", "layers", "elements"]);
    expect(actionHint("file", "open", true)).toMatch(/Open/);
    expect(actionHint("file", "open", false)).toBe("");
    expect(actionHint("view", "toolbarVisibility", true)).toMatch(/tray/i);
  });

  it("hides unsupported groups and disables in view mode", () => {
    expect(groupAvailability("image", ctx({ selection: "image" }))).toBe("hidden");
    expect(
      groupAvailability(
        "image",
        ctx({ selection: "image", capabilities: caps({ transform: true }) }),
      ),
    ).toBe("shown");
    expect(
      groupAvailability(
        "image",
        ctx({ selection: "image", mode: "view", capabilities: caps({ transform: true }) }),
      ),
    ).toBe("disabled");
  });

  it("shows every group on .filedom and text toolbar for a text selection", () => {
    const filedom = ctx({
      isFiledom: true,
      selection: "text",
      capabilities: caps({ editText: true, formatText: true }),
    });
    expect(groupAvailability("text", filedom)).toBe("shown");
    expect(groupAvailability("image", { ...filedom, selection: "image" })).toBe("shown");
    expect(groupAvailability("insert", { ...filedom, selection: "none", insertKinds: ["image"] })).toBe(
      "shown",
    );
    expect(
      groupAvailability("insert", {
        ...filedom,
        selection: "text",
        insertKinds: ["image"],
        capabilities: caps({ insert: true, editText: true, formatText: true }),
      }),
    ).toBe("shown");
    expect(groupAvailability("text", { ...filedom, selection: "none" })).toBe("hidden");
  });

  it("hides track history outside track mode and disables undo without canUndo", () => {
    expect(groupAvailability("trackHistory", ctx({ mode: "live" }))).toBe("hidden");
    expect(groupAvailability("trackHistory", ctx({ mode: "track" }))).toBe("shown");
    expect(actionAvailability("history", "undo", ctx({ canUndo: false }))).toBe("disabled");
    expect(actionAvailability("history", "undo", ctx({ canUndo: true }))).toBe("shown");
  });

  it("enables deselect when something is selected and keeps image replace available", () => {
    expect(actionAvailability("view", "deselect", ctx({ selection: "none" }))).toBe("disabled");
    expect(actionAvailability("view", "deselect", ctx({ selection: "image", capabilities: caps({ transform: true }) }))).toBe(
      "shown",
    );
    expect(
      actionAvailability("image", "replaceImage", ctx({ selection: "image", capabilities: caps({ transform: true }) })),
    ).toBe("shown");
    expect(
      actionAvailability("text", "highlight", ctx({ selection: "text", hasSelection: true, capabilities: caps({ editText: true }) })),
    ).toBe("shown");
  });

  it("shows a kind toolbar only for that file and keeps playback available in view mode", () => {
    expect(groupAvailability("audio", ctx())).toBe("hidden");
    expect(groupAvailability("audio", ctx({ fileKind: "document" satisfies FileKind }))).toBe("hidden");
    expect(groupAvailability("audio", ctx({ fileKind: "audio", mode: "view" }))).toBe("shown");
    expect(actionAvailability("audio", "playMedia", ctx({ fileKind: "audio", mode: "view" }))).toBe("shown");
    expect(groupAvailability("video", ctx({ fileKind: "audio" }))).toBe("hidden");
    expect(groupAvailability("video", ctx({ fileKind: "video" }))).toBe("shown");
    expect(groupAvailability("text", ctx({ fileKind: "audio", selection: "text" }))).toBe("hidden");
    expect(groupAvailability("archive", ctx({ fileKind: "archive" }))).toBe("shown");
    expect(groupAvailability("email", ctx({ fileKind: "email" }))).toBe("shown");
    expect(groupAvailability("sheet", ctx({ format: "csv" satisfies Format }))).toBe("shown");
    expect(groupAvailability("sheet", ctx({ format: "pdf", fileKind: "document" }))).toBe("hidden");
    expect(actionAvailability("sheet", "copyListing", ctx({ format: "csv", mode: "view" }))).toBe("shown");
  });

  it("shows the timeline only when the player is selected outside view mode", () => {
    const timeline = caps({ timeline: true });
    expect(groupAvailability("timeline", ctx())).toBe("hidden");
    expect(groupAvailability("timeline", ctx({ selection: "audio", capabilities: timeline }))).toBe("shown");
    expect(groupAvailability("timeline", ctx({ selection: "video", capabilities: timeline }))).toBe("shown");
    expect(groupAvailability("timeline", ctx({ selection: "audio", mode: "view", capabilities: timeline }))).toBe("hidden");
    expect(groupAvailability("timeline", ctx({ selection: "none", capabilities: timeline }))).toBe("hidden");
    expect(groupAvailability("timeline", ctx({ selection: "audio" }))).toBe("hidden");
    expect(actionAvailability("audio", "playMedia", ctx({ fileKind: "audio", mode: "view" }))).toBe("shown");
    expect(actionAvailability("timeline", "appendClip", ctx({ selection: "audio", mode: "view", capabilities: timeline }))).toBe(
      "hidden",
    );
    expect(actionAvailability("timeline", "clipSpeed", ctx({ selection: "audio", mode: "live", capabilities: timeline }))).toBe(
      "shown",
    );
  });

  it("hides insert kinds the adapter cannot place", () => {
    const insert = ctx({
      capabilities: caps({ insert: true }),
      insertKinds: ["image"],
      selection: "none",
    });
    expect(actionAvailability("insert", "insertImage", insert)).toBe("shown");
    expect(actionAvailability("insert", "insertCode", insert)).toBe("hidden");
    expect(actionAvailability("insert", "insertShape", insert)).toBe("hidden");
  });
});
