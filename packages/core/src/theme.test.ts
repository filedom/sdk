import { afterEach, describe, expect, it, vi } from "vitest";
import { VIEWER_CSS } from "./styles.js";
import {
  THEME_DEFAULTS,
  THEME_TOKENS,
  TOKEN_VAR,
  themeCaptureDeclarations,
  themeDefaultDeclarations,
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

  it("sets each token in the config slot, and tokens.accent wins over accent", () => {
    expect(themeTokenCss({ tokens: { surface: "#fbfaf7", radius: "2px" } }, ".dd-viewer")).toBe(
      ".dd-viewer{--dd-panel-config:#fbfaf7;--dd-radius-config:2px;}",
    );
    expect(themeTokenCss({ accent: "#7c3aed" }, ".dd-viewer")).toBe(
      ".dd-viewer{--dd-accent-config:#7c3aed;}",
    );
    expect(themeTokenCss({ accent: "#7c3aed", tokens: { accent: "#0f6e56" } }, ".dd-viewer")).toBe(
      ".dd-viewer{--dd-accent-config:#0f6e56;}",
    );
  });

  it("puts dark tokens under the dark theme only", () => {
    expect(themeTokenCss({ accent: "#0f6e56", dark: { surface: "#16201c" } }, ".dd-viewer")).toBe(
      ".dd-viewer{--dd-accent-config:#0f6e56;}.dd-viewer[data-theme=\"dark\"]{--dd-panel-dark:#16201c;}",
    );
  });

  it("drops a name that is not a token and a value that would end the rule", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const tokens = { fg: "#000", text: "red;}*{color:red", canvas: "#eee" };
    expect(themeTokenCss({ tokens: tokens as never }, ".dd-viewer")).toBe(
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
    expect(themeDefaultDeclarations("light")).toContain("--dd-fg-default:#1a1916");
    expect(themeDefaultDeclarations("dark")).toContain("--dd-fg-default:#f3efe6");
    expect(THEME_DEFAULTS.light.accent).toBe("#1a5f4a");
    expect(THEME_DEFAULTS.dark.background).toBe("#141311");
    expect(THEME_DEFAULTS.light.page).toBe("#fff");
    expect(THEME_DEFAULTS.dark.page).toBe("#fff");
    expect(themeDefaultDeclarations("high-contrast-light")).toContain("--dd-fg-default:#000");
    expect(themeDefaultDeclarations("high-contrast-dark")).toContain("--dd-fg-default:#fff");
    expect(THEME_DEFAULTS.light["control-down"]).toBeUndefined();
    expect(THEME_DEFAULTS.dark["control-down"]).toBeUndefined();
    expect(VIEWER_CSS).toContain("--dd-control-down:var(--dd-host-control-down,");
    expect(VIEWER_CSS).toContain("var(--dd-accent-tint)");
    expect(VIEWER_CSS).not.toContain("filter:");
  });
});
