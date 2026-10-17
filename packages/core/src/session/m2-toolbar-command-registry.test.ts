import { describe, expect, it } from "vitest";
import {
  listM2ToolbarCommandRegistry,
  resolveM2ToolbarCommandEntry,
  M2_TOOLBAR_COMMAND_REGISTRY_FEATURE_ID,
} from "./m2-toolbar-command-registry.js";

describe("F05 M2 toolbar command registry", () => {
  it("lists typed demo commands with dom ids", () => {
    const entries = listM2ToolbarCommandRegistry();
    expect(entries.length).toBe(3);
    expect(entries.map((e) => e.id)).toEqual(["save-stub", "undo-stub", "redo-stub"]);
    expect(resolveM2ToolbarCommandEntry("save-stub")?.domId).toBe("domdoc-toolbar-save-stub");
    expect(M2_TOOLBAR_COMMAND_REGISTRY_FEATURE_ID).toBe("F05");
  });
});
