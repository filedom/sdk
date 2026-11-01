// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { elementFactory } from "./dom.js";
import type { DocInfo } from "./engine-types.js";
import type { ToolbarActions, ToolbarState } from "./toolbar.js";
import { shortError, shownTextFormat, Toolbar } from "./toolbar.js";
import { HistoryPanel } from "./history.js";

function actions(): ToolbarActions {
  return {
    pick() {},
    newFile() {},
    download() {},
    storeDomdoc() {},
    exportFile() {},
    undo() {},
    redo() {},
    toggle() {},
    setColor() {},
    setFont() {},
    setSize() {},
    highlight() {},
    clearHighlight() {},
    setHighlightColor() {},
    comment() {},
    align() {},
    indent() {},
    setLineSpacing() {},
    setViewMode() {},
    search() {},
    nextHit() {},
    replaceMatch() {},
    replaceAll() {},
    zoomIn() {},
    zoomOut() {},
    setZoom() {},
    fit() {},
    insertElement() {},
    toggleTheme() {},
    setHelp() {},
    setToolbarVisible() {},
    setTrayVisible() {},
    lockToolbars() {},
    moveToolbar() {},
    replaceImage() {},
    deleteElement() {},
    deselect() {},
    paintShape() {},
    debugReport: () => "",
    playMedia() {},
    pauseMedia() {},
    muteMedia() {},
    setClipSpeed() {},
    appendClip() {},
    copyListing() {},
  };
}

function chrome(
  format: DocInfo["format"],
  viewMode: ToolbarState["viewMode"],
  selectionKind: ToolbarState["selectionKind"] = "none",
): ToolbarState {
  const isPdf = format === "pdf";
  return {
    info: {
      format,
      pageCount: 1,
      trackChanges: false,
      author: "",
      pendingRevisions: 0,
      exportExtension: format,
      exportMime: "",
      canUndo: false,
      canRedo: false,
      capabilities: {
        editText: true,
        editStructure: true,
        formatText: format !== "pdf",
        formatParagraph: format !== "pdf",
        flowEmbeds: false,
        transform: isPdf,
        layers: isPdf,
        insert: format === "docx" || format === "doc",
      },
      warnings: [],
    },
    viewMode,
    modeLocked: false,
    zoom: 1,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    hasSelection: false,
    selectionKind,
    insertKinds: format === "docx" || format === "doc" ? ["image", "text-box", "shape"] : [],
    isDomdoc: false,
    helpOn: false,
    toolbarsLocked: false,
    hiddenGroups: [],
    availableTrays: format === "pdf" ? ["layers"] : [],
    shownTrays: [],
  };
}

describe("image capabilities", () => {
  it("keeps the text format group hidden when formatText is omitted", () => {
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    const state = chrome("png", "live", "text");
    state.info = {
      ...state.info!,
      capabilities: {
        editText: true,
        editStructure: false,
        formatText: false,
        formatParagraph: false,
        flowEmbeds: false,
        transform: true,
        layers: false,
        insert: true,
      },
    };
    toolbar.sync(state);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text-format"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text-paragraph"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(false);

    toolbar.sync({ ...state, selectionKind: "image" });
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="image"]')!.hidden).toBe(false);

    toolbar.sync({ ...state, selectionKind: "shape" });
    expect(toolbar.el.querySelector<HTMLElement>('[data-action="fill"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-action="stroke"]')!.hidden).toBe(true);
  });
});

describe("toolbar icons", () => {
  it("uses a standard symbol where one exists and keeps the words that carry the action", () => {
    const bar = new Toolbar(elementFactory(document), actions(), "#fff59d").el;
    const labeled = (action: string, name: string, glyph: string) => {
      const button = bar.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
      expect(button.getAttribute("aria-label")).toBe(name);
      expect(button.querySelector("svg")?.getAttribute("data-icon")).toBe(glyph);
    };

    labeled("open", "Open", "folder");
    labeled("save", "Save", "download");
    labeled("undo", "Undo", "undo");
    labeled("redo", "Redo", "redo");
    labeled("alignLeft", "Align left", "align-left");
    labeled("alignJustify", "Justify", "align-justify");
    labeled("outdent", "Decrease indent", "outdent");
    labeled("indent", "Increase indent", "indent");
    labeled("highlight", "Highlight", "highlight");
    labeled("clearHighlight", "Clear highlight", "eraser");
    labeled("comment", "Comment", "comment");
    labeled("findPrev", "Previous match", "arrow-up");
    labeled("findNext", "Next match", "arrow-down");
    labeled("fitWidth", "Fit width", "fit-width");
    labeled("fitPage", "Fit page", "fit-page");
    labeled("theme", "Dark theme", "moon");
    labeled("deselect", "Deselect", "x");

    expect(bar.querySelector("[data-action=bold]")?.textContent).toBe("B");
    expect(bar.querySelector("[data-action=accept-all]")).toBeNull();
    expect(bar.querySelector("[data-action=reject-all]")).toBeNull();
    expect(bar.querySelector(".dd-layout")).toBeNull();
    expect(bar.querySelector("[data-action=copy-error]")?.textContent).toBe("Copy");
    expect(bar.querySelector("[data-action=debug-error]")?.textContent).toBe("Debug");

    const full = "engine: Failed to fetch dynamically imported module: https://domdoc.io/api/bundles/x";
    expect(shortError(full)).toBe("engine: Failed to fetch dynamically imported module");
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    toolbar.showError(full);
    expect(toolbar.el.querySelector("summary")?.textContent).toBe("engine: Failed to fetch dynamically imported module");
    expect(toolbar.el.querySelector("pre")?.textContent).toContain("https://domdoc.io/api/bundles/x");
    expect(toolbar.el.querySelector("details")?.hasAttribute("open")).toBe(false);
  });
});

describe("menu bar", () => {
  it("keeps the constant bar to menus and shows a toolbar only for the selection", () => {
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    toolbar.sync(chrome("docx", "live", "none"));
    const bar = toolbar.el.querySelector(".dd-toolbar-app")!;
    expect(bar.getAttribute("role")).toBe("menubar");
    expect([...bar.querySelectorAll(".dd-menu-trigger")].map((el) => el.textContent)).toEqual([
      "File",
      "Insert",
      "Mode",
      "View",
      "Help",
    ]);
    expect(toolbar.el.querySelector<HTMLElement>(".dd-toolbar-context")!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-menu-panel="file"]')!.hidden).toBe(true);

    const tools = toolbar.el.querySelector(".dd-toolbar-tools")!;
    for (const action of ["open", "save", "undo", "zoomOut", "zoomReset", "zoomIn", "find"]) {
      const control = tools.querySelector(`[data-action="${action}"]`);
      expect(control, action).not.toBeNull();
      expect(control?.closest("[hidden]")).toBeNull();
    }
    const find = toolbar.el.querySelector<HTMLElement>(".dd-find")!;
    expect(find.hidden).toBe(true);
    expect(find.querySelector("[data-action=replace]")?.getAttribute("aria-label")).toBe("Replace with");
    expect(find.querySelector("[data-action=replaceMatch]")?.textContent).toContain("Replace");
    expect(find.querySelector("[data-action=replaceAll]")?.textContent).toContain("Replace all");
    tools.querySelector<HTMLButtonElement>("[data-action=find]")!.click();
    expect(find.hidden).toBe(false);

    toolbar.el.querySelector<HTMLButtonElement>('[data-menu="file"]')!.click();
    expect(toolbar.el.querySelector<HTMLElement>('[data-menu-panel="file"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector('[data-menu-panel="file"] [data-action="save"]')).not.toBeNull();
    toolbar.el.querySelector<HTMLButtonElement>('[data-menu="view"]')!.click();
    expect(toolbar.el.querySelector<HTMLElement>('[data-menu-panel="file"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-menu-panel="view"]')!.hidden).toBe(false);

    toolbar.sync(chrome("docx", "live", "text"));
    expect(toolbar.el.querySelector<HTMLElement>(".dd-toolbar-context")!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="image"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="insert"]')!.hidden).toBe(false);

    toolbar.sync(chrome("pdf", "live", "image"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="image"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="shape"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>(".dd-toolbar-context")!.hidden).toBe(false);

    toolbar.sync(chrome("pdf", "live", "none"));
    expect(toolbar.el.querySelector<HTMLElement>(".dd-toolbar-context")!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="insert"]')!.hidden).toBe(true);
  });
});

describe("modes and contextual toolbars", () => {
  it("only offers live, track, and view, and swaps text vs image toolbars", () => {
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    const mode = toolbar.el.querySelector<HTMLSelectElement>('[data-action="mode"]')!;
    expect([...mode.options].map((o) => o.value)).toEqual(["live", "track", "view"]);

    toolbar.sync(chrome("pdf", "live", "text"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="image"]')!.hidden).toBe(true);

    toolbar.sync(chrome("pdf", "live", "image"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="image"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-group="image"] [data-action="replaceImage"]')!.disabled).toBe(
      false,
    );
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-group="image"] [data-action="deleteElement"]')!.disabled).toBe(
      false,
    );
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-action="deselect"]')!.disabled).toBe(false);

    toolbar.sync(chrome("pdf", "live", "text"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-action="highlight"]')!.disabled).toBe(true);

    toolbar.sync({ ...chrome("pdf", "live", "text"), hasSelection: true });
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-action="highlight"]')!.disabled).toBe(false);
  });

  it("hides insert kinds the adapter cannot place and disables editing in view mode", () => {
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    toolbar.sync(chrome("docx", "live"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="insert"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-action="insertImage"]')!.hidden).toBe(false);

    toolbar.sync(chrome("pdf", "live"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="insert"]')!.hidden).toBe(true);

    toolbar.sync(chrome("docx", "view"));
    expect(toolbar.el.querySelector<HTMLButtonElement>('[data-action="insertImage"]')!.disabled).toBe(true);
  });

  it("shows help hints when help is on and View can hide a toolbar", () => {
    let help = false;
    let hidden: string[] = [];
    const toolbar = new Toolbar(
      elementFactory(document),
      {
        ...actions(),
        setHelp: (on) => (help = on),
        setToolbarVisible: (id, visible) => {
          hidden = visible ? hidden.filter((g) => g !== id) : [...hidden, id];
        },
      },
      "#fff59d",
    );
    toolbar.sync({ ...chrome("docx", "live"), helpOn: true });
    expect(toolbar.el.querySelector<HTMLElement>('[data-action="open"]')!.title).toMatch(/Open/);
    toolbar.sync({ ...chrome("docx", "live"), helpOn: false });
    toolbar.el.querySelector<HTMLButtonElement>('[data-action="help"]')!.click();
    expect(help).toBe(true);
    toolbar.el.querySelector<HTMLButtonElement>('[data-action="toolbarVisibility"]')!.click();
    const check = toolbar.el.querySelector<HTMLInputElement>(".dd-view-menu input")!;
    check.checked = false;
    check.dispatchEvent(new Event("change"));
    expect(hidden.length).toBeGreaterThan(0);
  });

  it("lists trays in the Panels menu and toggles them", () => {
    const trays: Array<{ id: string; visible: boolean }> = [];
    const toolbar = new Toolbar(
      elementFactory(document),
      {
        ...actions(),
        setTrayVisible: (id, visible) => trays.push({ id, visible }),
      },
      "#fff59d",
    );
    toolbar.sync({
      ...chrome("pdf", "track"),
      availableTrays: ["history", "layers"],
      shownTrays: ["layers"],
    });
    expect(toolbar.el.querySelector('[data-action="toolbarVisibility"]')?.getAttribute("aria-label")).toBe(
      "Show or hide panels",
    );
    toolbar.el.querySelector<HTMLButtonElement>('[data-action="toolbarVisibility"]')!.click();
    const menu = toolbar.el.querySelector(".dd-view-menu")!;
    expect(menu.textContent).toContain("Toolbars");
    expect(menu.textContent).toContain("Trays");
    expect(menu.textContent).toContain("Track changes");
    expect(menu.textContent).toContain("Layers");
    const history = menu.querySelector<HTMLInputElement>('input[data-tray="history"]')!;
    const layers = menu.querySelector<HTMLInputElement>('input[data-tray="layers"]')!;
    expect(history.checked).toBe(false);
    expect(layers.checked).toBe(true);
    history.checked = true;
    history.dispatchEvent(new Event("change"));
    expect(trays).toEqual([{ id: "history", visible: true }]);
  });
});

describe("text format follows the selection", () => {
  it("preselects a shared font, size, and color, and leaves a mixed face blank", () => {
    const fonts: string[] = [];
    const sizes: number[] = [];
    const colors: string[] = [];
    const toolbar = new Toolbar(
      elementFactory(document),
      { ...actions(), setFont: (font) => fonts.push(font), setSize: (size) => sizes.push(size), setColor: (color) => colors.push(color) },
      "#fff59d",
    );
    toolbar.sync({
      ...chrome("pdf", "live", "text"),
      hasSelection: true,
      font: "Helvetica",
      sizePt: 14,
      color: "#c00000",
    });
    const font = toolbar.el.querySelector<HTMLSelectElement>('[data-action="font"]')!;
    const size = toolbar.el.querySelector<HTMLSelectElement>('[data-action="size"]')!;
    const color = toolbar.el.querySelector<HTMLInputElement>('[data-action="color"]')!;
    expect(font.value).toBe("Helvetica");
    expect(size.value).toBe("14");
    expect(color.value).toBe("#c00000");
    expect(fonts).toEqual([]);
    expect(sizes).toEqual([]);
    expect(colors).toEqual([]);

    toolbar.sync({ ...chrome("pdf", "live", "text"), hasSelection: true, sizePt: 13.5, color: "#000000" });
    expect(size.value).toBe("13.5");
    expect(font.selectedIndex).toBe(-1);
    expect(color.value).toBe("#000000");

    expect(shownTextFormat([{ font: "Times New Roman", fontSizePt: 18, color: "#112233" }], undefined)).toEqual({
      font: "Times New Roman",
      sizePt: 18,
      color: "#112233",
    });
    expect(
      shownTextFormat(
        [
          { font: "Helvetica", fontSizePt: 12 },
          { font: "Times New Roman", fontSizePt: 12, color: "#ff0000" },
        ],
        undefined,
      ),
    ).toEqual({ font: undefined, sizePt: 12, color: undefined });
    expect(shownTextFormat([{ font: "Helvetica", fontSizePt: 12 }], { font: "Georgia", sizePt: 20 })).toMatchObject({
      font: "Georgia",
      sizePt: 20,
      color: "#000000",
    });
  });
});

describe("kind toolbars", () => {
  it("shows audio controls for an mp3 and hides them for a pdf", () => {
    let played = 0;
    const sink = actions();
    sink.playMedia = () => {
      played += 1;
    };
    const toolbar = new Toolbar(elementFactory(document), sink, "#fff59d");
    const audio = chrome("mp3", "view", "text");
    audio.info!.capabilities = {
      editText: false,
      editStructure: false,
      formatText: false,
      formatParagraph: false,
      flowEmbeds: false,
      transform: false,
      layers: false,
      insert: false,
    };
    toolbar.sync(audio);
    const audioGroup = toolbar.el.querySelector<HTMLElement>('[data-group="audio"]')!;
    const play = audioGroup.querySelector<HTMLButtonElement>('[data-action="playMedia"]')!;
    expect(audioGroup.hidden).toBe(false);
    expect(play.disabled).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="text"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="video"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>(".dd-toolbar-context")!.hidden).toBe(false);
    play.click();
    expect(played).toBe(1);

    toolbar.sync(chrome("pdf", "live", "none"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="audio"]')!.hidden).toBe(true);
  });

  it("shows the sheet toolbar for csv and the archive toolbar for zip", () => {
    const toolbar = new Toolbar(elementFactory(document), actions(), "#fff59d");
    const sheet = chrome("csv", "view");
    sheet.info!.capabilities.editText = false;
    sheet.info!.capabilities.formatText = false;
    toolbar.sync(sheet);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="sheet"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="audio"]')!.hidden).toBe(true);

    toolbar.sync(chrome("zip", "view"));
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="archive"]')!.hidden).toBe(false);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="sheet"]')!.hidden).toBe(true);
    expect(toolbar.el.querySelector<HTMLElement>('[data-group="email"]')!.hidden).toBe(true);
  });
});

describe("history panel replaces accept/reject chrome", () => {
  it("restores a history row without accept-all buttons", () => {
    const restored: string[] = [];
    const panel = new HistoryPanel(elementFactory(document), {
      restoreHistory: (id) => restored.push(id),
      revertHistory() {},
    });
    panel.render([{ id: "1", label: "Typed hi" }]);
    panel.el.querySelector<HTMLButtonElement>(".dd-history-label")!.click();
    expect(restored).toEqual(["1"]);
  });
});
