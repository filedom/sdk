import { afterEach, describe, expect, it, vi } from "vitest";
import { VIEWER_CSS } from "./styles.js";
import {
  THEME_DEFAULTS,
  THEME_PRESETS,
  THEME_TOKENS,
  TOKEN_VAR,
  themeCaptureDeclarations,
  themeConfigForPreset,
  themeDefaultDeclarations,
  themePresetById,
  themePresetId,
  themeResolveDeclarations,
  themeTokenCss,
} from "./theme.js";

describe("themeTokenCss", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is empty without tokens", () => {
    expect(themeTokenCss("dark", ".dd-viewer")).toBe("");
    expect(themeTokenCss({ preference: "light" }, ".dd-viewer")).toBe("");
    expect(themeTokenCss(undefined, ".dd-viewer")).toBe("");
  });

  it("sets interface colors in the config slot", () => {
    expect(themeTokenCss({ ui: { surface: "#fbfaf7", radius: "2px" } }, ".dd-viewer")).toBe(
      ".dd-viewer{--dd-panel-config:#fbfaf7;--dd-radius-config:2px;}",
    );
  });

  it("keeps interface colors and document colors apart", () => {
    expect(
      themeTokenCss(
        { ui: { accent: "#445566", background: "#101820" }, document: { page: "#112233", ink: "#abcdef" } },
        ".dd-viewer",
      ),
    ).toBe(
      ".dd-viewer{--dd-accent-config:#445566;--dd-bg-config:#101820;--dd-page-config:#112233;--dd-ink-config:#abcdef;}",
    );
    expect(themeTokenCss({ ui: { accent: "#112233" }, document: { page: "#fffef0" } }, ".dd-viewer")).toBe(
      ".dd-viewer{--dd-accent-config:#112233;--dd-page-config:#fffef0;}",
    );
    expect(themeTokenCss({ document: { caret: "#c45c26", "canvas-fill": "#fff1e0" } }, ".dd-viewer")).toBe(
      ".dd-viewer{--dd-caret-config:#c45c26;--dd-canvas-fill-config:#fff1e0;}",
    );
  });

  it("drops a name that is not a token and a value that would end the rule", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ui = { fg: "#000", text: "red;}*{color:red", canvas: "#eee" };
    expect(themeTokenCss({ ui: ui as never }, ".dd-viewer")).toBe(
      ".dd-viewer{--dd-canvas-config:#eee;}",
    );
    expect(warn).toHaveBeenCalledTimes(2);
    expect(String(warn.mock.calls[0]?.[0])).toContain('"fg"');
    expect(String(warn.mock.calls[1]?.[0])).toContain('"text"');
  });
});

describe("viewer stylesheet", () => {
  it("captures every token on the host wrapper and resolves it on the viewer", () => {
    expect(VIEWER_CSS).toContain(themeCaptureDeclarations());
    expect(VIEWER_CSS).toContain(themeResolveDeclarations());
    for (const token of THEME_TOKENS) {
      const css = TOKEN_VAR[token];
      expect(VIEWER_CSS).toContain(`--dd-host-${css}:var(--dd-${css})`);
      expect(VIEWER_CSS).toContain(`--dd-${css}:var(--dd-host-${css},`);
    }
  });

  it("gives every mode its text color, and leaves pressed controls on the accent tint", () => {
    expect(themeDefaultDeclarations("light")).toContain("--dd-fg-default:#07131c");
    expect(themeDefaultDeclarations("dark")).toContain("--dd-fg-default:#f4f8fb");
    expect(THEME_DEFAULTS.light.accent).toBe("#3564d9");
    expect(THEME_DEFAULTS.dark.accent).toBe("#7c9ae6");
    expect(THEME_DEFAULTS.dark.background).toBe("#05080c");
    expect(THEME_DEFAULTS.light.page).toBe("#fff");
    expect(THEME_DEFAULTS.dark.page).toBe("#fff");
    expect(THEME_DEFAULTS.light.ink).toBe("#07131c");
    expect(THEME_DEFAULTS.light.caret).toBe("#07131c");
    expect(THEME_DEFAULTS.light["caret-width"]).toBe("1px");
    expect(THEME_DEFAULTS.light["canvas-fill"]).toBeUndefined();
    expect(themeDefaultDeclarations("light")).toContain("--dd-ink-default:#07131c");
    expect(themeDefaultDeclarations("light")).toContain("--dd-caret-default:#07131c");
    expect(themeDefaultDeclarations("light")).not.toContain("--dd-canvas-fill-default");
    expect(THEME_DEFAULTS.light["control-down"]).toBeUndefined();
    expect(THEME_DEFAULTS.dark["control-down"]).toBeUndefined();
    expect(VIEWER_CSS).toContain("--dd-control-down:var(--dd-host-control-down,");
    expect(VIEWER_CSS).toContain("var(--dd-accent-tint)");
    expect(VIEWER_CSS).not.toContain("filter:");
  });
});

describe("theme presets", () => {
  it("offers the website palette as FileDOM and keeps the other variations distinct", () => {
    expect(THEME_PRESETS.map((preset) => preset.id)).toEqual(["filedom", "filedom-dark", "paper", "ink"]);
    expect(themeConfigForPreset(THEME_PRESETS[0]!)).toEqual({ preference: "light" });
    expect(themeConfigForPreset(THEME_PRESETS[1]!)).toEqual({ preference: "dark" });
    expect(themePresetById("paper")?.ui?.accent).toBe("#1a5f4a");
    expect(themePresetById("ink")?.ui?.background).toBe("#141311");
    expect(themePresetId("light", "light")).toBe("filedom");
    expect(themePresetId("dark", "dark")).toBe("filedom-dark");
    expect(themePresetId("system", "dark")).toBe("filedom-dark");
    expect(themePresetId("paper", "light")).toBe("paper");
    expect(themePresetId({ preference: "dark", ui: { accent: "#0f6e56" } }, "dark")).toBe("custom");
    expect(themePresetId({ preference: "light", document: { page: "#fffef0" } }, "light")).toBe("custom");
  });
});
