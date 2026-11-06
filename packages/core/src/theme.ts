/**
 * Chrome and document colors. `system` follows the OS.
 *
 * A `--dd-*` variable on the mount element wins over `theme.ui` and
 * `theme.document`, which win over the mode's defaults.
 */

/** A concrete palette. `system` is not one of these; it resolves to light or dark. */
export type ThemeName = "light" | "dark";

export type ThemePreference = ThemeName | "system";

/**
 * Public tokens. Each name is the CSS variable `--dd-<var>` (see {@link TOKEN_VAR}).
 * `surface` is the toolbar and side panel; `canvas` is the page well; `page` is the paper.
 */
export const THEME_TOKENS = [
  "accent",
  "background",
  "surface",
  "surface-raised",
  "text",
  "text-muted",
  "border",
  "hover",
  "canvas",
  "page",
  "ink",
  "caret",
  "caret-width",
  "canvas-fill",
  "radius",
  "font",
  "ins",
  "del",
  "search",
  "search-active",
  "control",
  "control-down",
  "field",
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];

/** Token values by name. Each value is a CSS value: `{ surface: "#fbfaf7", radius: "2px" }`. */
export type ThemeTokens = { readonly [Name in ThemeToken]?: string };

/** Chrome colors. These paint the toolbar, panels, and the well around the page. */
export type UiTheme = Pick<
  ThemeTokens,
  | "accent"
  | "background"
  | "surface"
  | "surface-raised"
  | "text"
  | "text-muted"
  | "border"
  | "hover"
  | "canvas"
  | "radius"
  | "font"
  | "control"
  | "control-down"
  | "field"
>;

/** Page colors and the marks drawn in HTML over the page. The canvas stays transparent until `canvas-fill` is set. */
export type DocumentTheme = Pick<
  ThemeTokens,
  "page" | "ink" | "caret" | "caret-width" | "canvas-fill" | "ins" | "del" | "search" | "search-active"
>;

export interface ThemeConfig {
  /** `system` follows the OS. Omitted means light. */
  preference?: ThemePreference;
  /** Chrome colors. */
  ui?: UiTheme;
  /** Document colors. A dark chrome still leaves the page white until this sets it. */
  document?: DocumentTheme;
}

/** Color fields in the Theme panel, in menu order. */
export const UI_THEME_FIELDS = [
  ["accent", "Accent"],
  ["background", "Background"],
  ["surface", "Toolbar"],
  ["surface-raised", "Raised"],
  ["text", "Text"],
  ["text-muted", "Muted text"],
  ["border", "Border"],
  ["hover", "Hover"],
  ["canvas", "Canvas"],
  ["control", "Control"],
  ["field", "Field"],
] as const satisfies ReadonlyArray<readonly [keyof UiTheme, string]>;

export const DOCUMENT_THEME_FIELDS = [
  ["page", "Page background"],
  ["ink", "Ink"],
  ["caret", "Caret"],
  ["ins", "Inserted text"],
  ["del", "Deleted text"],
  ["search", "Search"],
  ["search-active", "Current match"],
] as const satisfies ReadonlyArray<readonly [keyof DocumentTheme, string]>;

/** Document values that are not colors. An empty canvas fill leaves the canvas transparent. */
export const DOCUMENT_TEXT_FIELDS = [
  ["canvas-fill", "Canvas fill"],
  ["caret-width", "Caret width"],
] as const satisfies ReadonlyArray<readonly [keyof DocumentTheme, string]>;

/** Chrome values that are not colors. */
export const UI_TEXT_FIELDS = [
  ["radius", "Corner radius"],
  ["font", "Font"],
] as const satisfies ReadonlyArray<readonly [keyof UiTheme, string]>;

/** CSS variable suffix for a token. `surface` is `--dd-panel`. */
export const TOKEN_VAR: { readonly [Name in ThemeToken]: string } = {
  accent: "accent",
  background: "bg",
  surface: "panel",
  "surface-raised": "raised",
  text: "fg",
  "text-muted": "muted",
  border: "border",
  hover: "hover",
  canvas: "canvas",
  page: "page",
  ink: "ink",
  caret: "caret",
  "caret-width": "caret-width",
  "canvas-fill": "canvas-fill",
  radius: "radius",
  font: "font",
  ins: "ins",
  del: "del",
  search: "search",
  "search-active": "search-active",
  control: "control",
  "control-down": "control-down",
  field: "field",
};

const FONT = '"Saira","Segoe UI",sans-serif';

/**
 * Mode defaults. `control-down` is omitted so a pressed control is a tint of the accent.
 * The page stays white in both modes. The caret matches that ink. The canvas has no fill.
 */
export const THEME_DEFAULTS: {
  readonly [Mode in ThemeName]: { readonly [Name in ThemeToken]?: string };
} = {
  light: {
    accent: "#3564d9",
    background: "#f4f5fb",
    surface: "#f4f5fb",
    "surface-raised": "#fff",
    text: "#07131c",
    "text-muted": "#4c6072",
    border: "rgba(7, 19, 28, 0.12)",
    hover: "#e8eaf8",
    canvas: "#e8eaf8",
    page: "#fff",
    ink: "#07131c",
    caret: "#07131c",
    "caret-width": "1px",
    radius: "0.45rem",
    font: FONT,
    ins: "#1565c0",
    del: "#c62828",
    search: "#ffd500",
    "search-active": "#ff9632",
    control: "#e8eaf8",
    field: "#fff",
  },
  dark: {
    accent: "#7c9ae6",
    background: "#05080c",
    surface: "#101820",
    "surface-raised": "#16202a",
    text: "#f4f8fb",
    "text-muted": "#a3b4c4",
    border: "rgba(244, 248, 251, 0.14)",
    hover: "#101820",
    canvas: "#101820",
    page: "#fff",
    ink: "#07131c",
    caret: "#07131c",
    "caret-width": "1px",
    radius: "0.45rem",
    font: FONT,
    ins: "#79b8ff",
    del: "#ff7b72",
    search: "#ffd500",
    "search-active": "#ff9632",
    control: "#101820",
    field: "#05080c",
  },
};

/** Normalize the shorthand. A string is a preference; omitted is an empty config. */
export function themeConfigOf(theme: ThemePreference | ThemeConfig | undefined): ThemeConfig {
  if (typeof theme === "string") return { preference: theme };
  return theme ?? {};
}

const isThemeToken = (name: string): name is ThemeToken =>
  (THEME_TOKENS as readonly string[]).includes(name);

/** Ends a declaration or the style element. A token value is never allowed to do either. */
const UNSAFE_VALUE = /[{};<>]/;

function declarations(tokens: ThemeTokens | undefined): string {
  if (!tokens) return "";
  const parts = Object.entries(tokens).filter(([name, value]) => {
    if (value === undefined) return false;
    if (!isThemeToken(name)) {
      console.warn(`[filedom] theme: "${name}" isn't a token, ignored`);
      return false;
    }
    if (typeof value !== "string" || value.trim() === "" || UNSAFE_VALUE.test(value)) {
      console.warn(`[filedom] theme: ignoring the invalid value of "${name}"`);
      return false;
    }
    return true;
  });
  if (!parts.length) return "";
  return `${parts.map(([name, value]) => `--dd-${TOKEN_VAR[name as ThemeToken]}-config:${value}`).join(";")};`;
}

/**
 * CSS that applies a theme's tokens on one viewer (`root` is a selector for that viewer).
 * Host variables still win: the sheet only sets the `*-config` slots.
 * Empty when the theme sets no token.
 */
export function themeTokenCss(theme: ThemePreference | ThemeConfig | undefined, root: string): string {
  const sheet = declarations(configuredTokens(themeConfigOf(theme)));
  return sheet ? `${root}{${sheet}}` : "";
}

/** The colors on screen for one mode: defaults, then the config. */
export function themeValues(mode: ThemeName, theme: ThemePreference | ThemeConfig | undefined): ThemeTokens {
  return {
    ...THEME_DEFAULTS[mode],
    ...configuredTokens(themeConfigOf(theme)),
  };
}

/** Tokens a config sets explicitly. `document` wins when the same name is also set on `ui`. */
export function configuredTokens(config: ThemeConfig): ThemeTokens {
  return {
    ...config.ui,
    ...config.document,
  };
}

/** Copies inherited `--dd-*` values before the viewer assigns its own. */
export function themeCaptureDeclarations(): string {
  return `${THEME_TOKENS.map((token) => {
    const css = TOKEN_VAR[token];
    return `--dd-host-${css}:var(--dd-${css})`;
  }).join(";")};`;
}

/** Resolves each token: host, then config, then the mode default. */
export function themeResolveDeclarations(): string {
  return `${THEME_TOKENS.map((token) => {
    const css = TOKEN_VAR[token];
    const tail =
      token === "control-down"
        ? `var(--dd-${css}-default,var(--dd-accent-tint))`
        : `var(--dd-${css}-default)`;
    return `--dd-${css}:var(--dd-host-${css},var(--dd-${css}-config,${tail}))`;
  }).join(";")};`;
}

/** The mode's `--dd-*-default` values. Skips tokens that mode leaves to a derived tint. */
export function themeDefaultDeclarations(mode: ThemeName): string {
  const parts = THEME_TOKENS.flatMap((token) => {
    const value = THEME_DEFAULTS[mode][token];
    return value === undefined ? [] : [`--dd-${TOKEN_VAR[token]}-default:${value}`];
  });
  return parts.length ? `${parts.join(";")};` : "";
}

/** A named chrome palette. FileDOM is the website palette and the default. */
export interface ThemePreset {
  readonly id: string;
  readonly label: string;
  readonly preference: ThemeName;
  /** Interface overrides for this palette. Omitted keys keep the mode defaults. */
  readonly ui?: UiTheme;
}

const PAPER_FONT = '"Source Sans 3","Avenir Next","Segoe UI",sans-serif';

/**
 * Variations shown in Settings.
 * FileDOM and FileDOM Dark are the website light and dark palettes.
 */
export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: "filedom", label: "FileDOM", preference: "light" },
  { id: "filedom-dark", label: "FileDOM Dark", preference: "dark" },
  {
    id: "paper",
    label: "Paper",
    preference: "light",
    ui: {
      accent: "#1a5f4a",
      background: "#f4f0e8",
      surface: "#f4f0e8",
      "surface-raised": "#ffffff",
      text: "#1a1916",
      "text-muted": "#5e584e",
      border: "rgba(26, 25, 22, 0.14)",
      hover: "#ebe4d6",
      canvas: "#ebe4d6",
      radius: "2px",
      font: PAPER_FONT,
      control: "#f6f8fa",
      field: "#ffffff",
    },
  },
  {
    id: "ink",
    label: "Ink",
    preference: "dark",
    ui: {
      accent: "#7dbaa4",
      background: "#141311",
      surface: "#1c1b18",
      "surface-raised": "#242220",
      text: "#f3efe6",
      "text-muted": "#a39c90",
      border: "rgba(243, 239, 230, 0.14)",
      hover: "#2a2825",
      canvas: "#1a1916",
      radius: "2px",
      font: PAPER_FONT,
      control: "#2a2825",
      field: "#141311",
    },
  },
];

export function themePresetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}

/** A preset as a theme config. FileDOM leaves the mode defaults in place. */
export function themeConfigForPreset(preset: ThemePreset): ThemeConfig {
  return preset.ui ? { preference: preset.preference, ui: preset.ui } : { preference: preset.preference };
}

/**
 * Which menu row matches a config. A palette that sets its own colors is `custom`.
 * The FileDOM row is the mode default, with no extra tokens.
 */
export function themePresetId(theme: ThemePreference | ThemeConfig | undefined, shown: ThemeName): string {
  if (typeof theme === "string" && themePresetById(theme)) return theme;
  const config = themeConfigOf(theme);
  const named = THEME_PRESETS.find(
    (preset) => preset.preference === config.preference && sameFields(preset.ui, config.ui) && !hasOwn(config.document),
  );
  if (named) return named.id;
  if (shown === "dark" || config.preference === "dark") return hasCustom(config) ? "custom" : "filedom-dark";
  return hasCustom(config) ? "custom" : "filedom";
}

function hasOwn(tokens: ThemeTokens | undefined): boolean {
  return tokens !== undefined && Object.values(tokens).some((value) => value !== undefined);
}

function hasCustom(config: ThemeConfig): boolean {
  return hasOwn(config.ui) || hasOwn(config.document);
}

function sameFields(preset: UiTheme | undefined, ui: UiTheme | undefined): boolean {
  const left = preset ?? {};
  const right = ui ?? {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (left[key as keyof UiTheme] !== right[key as keyof UiTheme]) return false;
  }
  return true;
}

let nextViewerKey = 0;

/** A selector-safe id so two viewers on one page keep their token sheets apart. */
export function nextThemeKey(): string {
  nextViewerKey += 1;
  return `d${nextViewerKey}`;
}
