// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { DomdocViewer } from "./viewer.js";

describe("viewer theme", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    document.head.querySelector("style[data-domdoc]")?.remove();
  });

  it("starts light and switches palette, tokens, and the OS scheme in place", () => {
    let dark = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() {
        return query === "(prefers-color-scheme: dark)" ? dark : false;
      },
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    }));

    const root = document.createElement("div");
    document.body.append(root);
    const viewer = new DomdocViewer(root, { bundles: {} });
    const themes: string[] = [];
    viewer.on("theme", (event) => themes.push(event.theme));
    const shell = root.querySelector<HTMLElement>(".dd-viewer")!;
    const capture = root.querySelector(".dd-capture")!;

    expect(capture.contains(shell)).toBe(true);
    expect(shell.dataset.theme).toBe("light");
    expect(shell.querySelector("style")?.textContent).toBe("");
    const themeButton = root.querySelector<HTMLButtonElement>("[data-action=theme]")!;
    expect(themeButton.getAttribute("aria-label")).toBe("Dark theme");
    expect(themeButton.querySelector("svg")?.getAttribute("data-icon")).toBe("moon");
    expect(themeButton.getAttribute("aria-pressed")).toBe("false");
    themeButton.click();
    expect(shell.dataset.theme).toBe("dark");
    expect(themeButton.getAttribute("aria-label")).toBe("Light theme");
    expect(themeButton.querySelector("svg")?.getAttribute("data-icon")).toBe("sun");
    expect(themes).toEqual(["dark"]);
    expect(themeButton.getAttribute("aria-pressed")).toBe("true");
    themeButton.click();
    expect(shell.dataset.theme).toBe("light");
    expect(themeButton.getAttribute("aria-pressed")).toBe("false");

    viewer.setTheme({ preference: "dark", accent: "#0f6e56", dark: { surface: "#16201c" } });
    expect(shell.dataset.theme).toBe("dark");
    expect(shell.dataset.scheme).toBeUndefined();
    const sheet = shell.querySelector("style")?.textContent ?? "";
    expect(sheet).toContain("--dd-accent-config:#0f6e56");
    expect(sheet).toContain('[data-theme="dark"]');
    expect(sheet).toContain("--dd-panel-dark:#16201c");

    viewer.setTheme("high-contrast-dark");
    expect(shell.dataset.theme).toBe("high-contrast-dark");
    expect(themeButton.getAttribute("aria-pressed")).toBe("true");

    viewer.setTheme({ preference: "light", accent: "#7c3aed" });
    themeButton.click();
    expect(shell.dataset.theme).toBe("dark");
    expect(shell.querySelector("style")?.textContent).toContain("--dd-accent-config:#7c3aed");

    viewer.setTheme("system");
    expect(shell.dataset.scheme).toBe("system");
    expect(shell.dataset.theme).toBe("light");
    dark = true;
    for (const listener of listeners) listener();
    expect(shell.dataset.theme).toBe("dark");
    expect(themeButton.getAttribute("aria-pressed")).toBe("true");

    viewer.destroy();
    expect(root.querySelector(".dd-viewer")).toBeNull();
    expect(root.querySelector(".dd-capture")).toBeNull();
  });
});
