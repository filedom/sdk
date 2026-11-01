import { themeCaptureDeclarations, themeDefaultDeclarations, themeResolveDeclarations } from "./theme.js";

export const VIEWER_CSS = `
.dd-capture{display:flex;flex-direction:column;height:100%;min-height:0;min-width:0;${themeCaptureDeclarations()}}
.dd-viewer{${themeDefaultDeclarations("light")}${themeResolveDeclarations()}--dd-accent-tint:color-mix(in srgb, var(--dd-accent) 18%, var(--dd-panel));--dd-sel:color-mix(in srgb, var(--dd-accent) 35%, transparent);--dd-hit:color-mix(in srgb, var(--dd-search) 55%, transparent);--dd-hit-current:color-mix(in srgb, var(--dd-search-active) 70%, transparent);--dd-error-bg:color-mix(in srgb, var(--dd-del) 12%, var(--dd-panel));--dd-drop:color-mix(in srgb, var(--dd-accent) 18%, var(--dd-canvas));--dd-scrollbar:color-mix(in srgb, var(--dd-fg) 35%, transparent);--dd-on-accent:#fff;--dd-ink:#111;--dd-zoom:1;--dd-scale:1.333333;--px-per-pt:1.333333;color-scheme:light;
  display:flex;flex:1;flex-direction:column;min-height:0;min-width:0;font:13px/1.4 var(--dd-font);color:var(--dd-fg);background:var(--dd-bg);position:relative}
.dd-viewer[data-theme="dark"]{${themeDefaultDeclarations("dark")}--dd-accent-tint:color-mix(in srgb, var(--dd-accent) 25%, var(--dd-panel));--dd-scrollbar:color-mix(in srgb, var(--dd-fg) 28%, transparent);color-scheme:dark}
.dd-viewer[data-theme="high-contrast-light"]{${themeDefaultDeclarations("high-contrast-light")}color-scheme:light}
.dd-viewer[data-theme="high-contrast-dark"]{${themeDefaultDeclarations("high-contrast-dark")}--dd-on-accent:#000;color-scheme:dark}
.dd-viewer[data-theme^="high-contrast"] .dd-toolbar button,.dd-viewer[data-theme^="high-contrast"] .dd-toolbar select,.dd-viewer[data-theme^="high-contrast"] .dd-toolbar input[type=search]{border-color:var(--dd-border);background-color:var(--dd-control)}
.dd-viewer[data-theme^="high-contrast"] .dd-toolbar button[aria-pressed="true"]{background:var(--dd-control-down);border-color:var(--dd-accent);color:var(--dd-on-accent)}
.dd-viewer[data-theme^="high-contrast"] .dd-sel,.dd-viewer[data-theme^="high-contrast"] .dd-hit{outline:2px solid #000}
.dd-viewer>style{display:none}
.dd-chrome{display:flex;flex-direction:column;flex:none;background:var(--dd-panel);border-bottom:1px solid var(--dd-border);color:var(--dd-fg)}
.dd-toolbar{display:flex;flex-wrap:wrap;align-items:center;column-gap:14px;row-gap:4px;padding:6px 12px;min-height:42px}
.dd-toolbar-app{position:relative;z-index:5;column-gap:2px;row-gap:0;padding:2px 8px;min-height:36px}
.dd-toolbar-context{border-top:1px solid color-mix(in srgb,var(--dd-border) 75%,transparent);background:color-mix(in srgb,var(--dd-canvas) 42%,var(--dd-panel))}
.dd-toolbar-context[hidden]{display:none}
.dd-toolbar-group{display:inline-flex;flex-wrap:wrap;gap:2px;align-items:center;padding:1px 0;border-radius:8px;position:relative}
.dd-toolbar-group[hidden]{display:none}
.dd-menu-item{position:relative;gap:0}
.dd-menu-trigger{height:30px;padding:0 10px;font-weight:550}
.dd-menu-trigger[aria-expanded="true"]{background:var(--dd-hover)}
.dd-toolbar-group[data-group]:not([data-group="view"]):not(.dd-menu-item){cursor:grab}
.dd-viewer[data-toolbars-locked] .dd-toolbar-group{cursor:default}
.dd-toolbar button,.dd-toolbar label,.dd-toolbar input,.dd-toolbar select{font:inherit;color:var(--dd-fg)}
.dd-toolbar button{box-sizing:border-box;height:28px;min-width:28px;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;background:transparent;border-radius:7px;padding:0 9px;cursor:pointer;transition:background-color .12s ease,color .12s ease,border-color .12s ease}
.dd-toolbar button[hidden],.dd-toolbar select[hidden],.dd-toolbar input[hidden]{display:none}
.dd-toolbar button:not(.dd-icon){font-weight:550;letter-spacing:-.011em}
.dd-toolbar button:hover:not(:disabled):not([aria-pressed="true"]){background:var(--dd-hover)}
.dd-toolbar button:focus-visible,.dd-toolbar select:focus-visible,.dd-toolbar input:focus-visible,.dd-password input:focus-visible,.dd-password button:focus-visible,.dd-rev button:focus-visible,.dd-history-row button:focus-visible,.dd-layer-row button:focus-visible{outline:2px solid var(--dd-accent);outline-offset:1px}
.dd-toolbar button:disabled{opacity:.38;cursor:default}
.dd-toolbar select:disabled,.dd-toolbar input[type=color]:disabled{opacity:1;color:var(--dd-fg);-webkit-text-fill-color:var(--dd-fg);cursor:default}
.dd-toolbar input:disabled:not([type=color]){opacity:.55;cursor:default}
.dd-toolbar button[aria-pressed="true"]{background:var(--dd-accent-tint);color:var(--dd-accent);border-color:color-mix(in srgb,var(--dd-accent) 28%,transparent)}
.dd-toolbar [data-action="bold"],.dd-toolbar [data-action="italic"],.dd-toolbar [data-action="underline"],.dd-toolbar [data-action="strike"]{width:28px;padding:0;font-family:Georgia,"Iowan Old Style","Palatino Linotype",Palatino,serif;font-size:15px;font-weight:500}
.dd-toolbar [data-action="bold"]{font-weight:700}
.dd-toolbar [data-action="italic"]{font-style:italic}
.dd-toolbar [data-action="underline"]{text-decoration:underline;text-underline-offset:3px}
.dd-toolbar [data-action="strike"]{text-decoration:line-through}
.dd-toolbar [data-action="zoomReset"]{min-width:3.5em;font-variant-numeric:tabular-nums;font-weight:600}
.dd-icon{display:inline-flex;align-items:center;justify-content:center;line-height:0;flex:none}
.dd-toolbar button.dd-icon{width:28px;padding:0}
.dd-icon svg{display:block;pointer-events:none}
.dd-toolbar input[type=search],.dd-toolbar select{box-sizing:border-box;height:28px;border:1px solid color-mix(in srgb,var(--dd-border) 88%,transparent);border-radius:7px;background-color:var(--dd-field)}
.dd-toolbar select{appearance:none;padding:0 22px 0 8px;background-image:linear-gradient(45deg,transparent 50%,var(--dd-muted) 50%),linear-gradient(135deg,var(--dd-muted) 50%,transparent 50%);background-position:calc(100% - 13px) 50%,calc(100% - 8px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;cursor:pointer}
.dd-toolbar select:hover:not(:disabled),.dd-toolbar input[type=search]:hover:not(:disabled){border-color:color-mix(in srgb,var(--dd-fg) 24%,var(--dd-border))}
.dd-toolbar [data-action="font"]{width:9.5em;font-weight:520}
.dd-toolbar [data-action="size"],.dd-toolbar [data-action="spacing"]{width:4.4em;font-variant-numeric:tabular-nums;text-align:start}
.dd-toolbar [data-action="mode"]{min-width:7.25em}
.dd-toolbar input[type=search]{width:11em;padding:0 10px}
.dd-toolbar input[type=search]::placeholder{color:var(--dd-muted)}
.dd-sep{width:1px;align-self:stretch;background:var(--dd-border);margin:0 2px}
.dd-menu-sep{height:1px;margin:4px 6px;background:var(--dd-border);flex:none}
.dd-app-menu{position:absolute;top:calc(100% + 4px);inset-inline-start:0;z-index:8;min-width:12.5em;max-height:min(70vh,28em);overflow:auto;align-items:stretch;padding:4px}
.dd-app-menu[hidden]{display:none}
.dd-app-menu button,.dd-app-menu select,.dd-app-menu input[type=search]{width:100%;justify-content:flex-start}
.dd-app-menu select,.dd-app-menu input[type=search]{min-width:0}
.dd-menu-command{gap:8px;padding:0 8px}
.dd-menu-command .dd-menu-label{flex:1;text-align:start}
.dd-app-menu .dd-view-menu{position:static;z-index:auto;margin-top:4px;min-width:0;max-height:none;box-shadow:none;border:0;border-top:1px solid var(--dd-border);border-radius:0;padding:4px 0 0}
.dd-view-menu{position:absolute;top:100%;left:0;z-index:8;min-width:12em}
.dd-dialog{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px;margin:8px;background:var(--dd-raised);border:1px solid var(--dd-border);border-radius:var(--dd-radius)}
.dd-history-row,.dd-layer-row{display:flex;gap:6px;align-items:center;margin:0 0 8px}
.dd-history-row[data-current]{outline:1px solid var(--dd-accent)}
.dd-history-label,.dd-layer-name{flex:1;text-align:start;border:0;background:transparent;color:inherit;cursor:pointer;padding:4px 0}
.dd-layer-group{display:flex;flex-direction:column;gap:4px;margin:0 0 12px}
.dd-layer-heading{margin:0;font:600 12px/1.3 var(--dd-font);color:var(--dd-muted)}
.dd-layer-header{margin:0 0 4px}
.dd-layer-element{display:flex;gap:8px;align-items:center;width:100%;padding:4px;border:1px solid transparent;border-radius:var(--dd-radius);background:transparent;color:inherit;cursor:pointer;text-align:start}
.dd-layer-element:hover{background:var(--dd-field)}
.dd-layer-element[data-selected]{border-color:var(--dd-accent);background:var(--dd-field)}
.dd-layer-thumb{flex:none;width:40px;height:40px;border:1px solid var(--dd-border);border-radius:4px;background:#fff}
.dd-layer-meta{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.dd-layer-element-name{font:12px/1.3 var(--dd-font);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dd-layer-element-id{font:10px/1.2 var(--dd-font);color:var(--dd-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dd-toolbar .dd-swatch{width:22px;height:22px;margin:0 2px;padding:0;border:1px solid color-mix(in srgb,var(--dd-fg) 18%,var(--dd-border));border-radius:50%;background:transparent;box-shadow:inset 0 0 0 2px var(--dd-panel);cursor:pointer;overflow:hidden}
.dd-toolbar .dd-swatch::-webkit-color-swatch-wrapper{padding:0}
.dd-toolbar .dd-swatch::-webkit-color-swatch,.dd-toolbar .dd-swatch::-moz-color-swatch{border:0;border-radius:50%}
.dd-status{margin-inline-start:auto;color:var(--dd-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40%;user-select:text;cursor:text}
.dd-status[data-tone=error]{color:var(--dd-del)}
.dd-error{flex:1 0 100%;margin-top:4px;border:1px solid var(--dd-del);border-radius:var(--dd-radius);background:var(--dd-error-bg);color:var(--dd-del)}
.dd-error[hidden]{display:none}
.dd-error summary{cursor:pointer;padding:4px 8px;user-select:none}
.dd-error-body{display:flex;gap:8px;align-items:flex-start;padding:0 8px 8px}
.dd-error-actions{display:flex;flex-direction:column;gap:4px;flex:none}
.dd-error-actions button{white-space:nowrap}
.dd-error pre{flex:1;min-width:0;margin:0;max-height:9em;overflow:auto;white-space:pre-wrap;user-select:text;cursor:text;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dd-fg);scrollbar-color:var(--dd-scrollbar) transparent}
.dd-body{display:flex;flex:1;min-height:0}
.dd-pages{position:relative;flex:1;overflow:auto;padding:28px 24px;display:flex;flex-direction:column;align-items:flex-start;gap:28px;outline:none;background:var(--dd-canvas);scrollbar-color:var(--dd-scrollbar) transparent}
.dd-empty{margin:auto;text-align:center;color:var(--dd-muted);border:1px dashed color-mix(in srgb,var(--dd-muted) 45%,var(--dd-border));border-radius:14px;padding:48px 56px;cursor:pointer;background:color-mix(in srgb,var(--dd-page) 72%,transparent)}
.dd-empty:hover,.dd-empty:focus-visible{border-color:var(--dd-accent);color:var(--dd-fg);outline:none}
.dd-loading{margin:auto;display:flex;flex-direction:column;align-items:center;gap:12px;color:var(--dd-muted)}
.dd-loading[hidden]{display:none}
.dd-trial{flex:none;padding:6px 12px;text-align:center;font-weight:650;background:var(--dd-accent-tint);color:var(--dd-fg)}
.dd-trial[hidden]{display:none}
.dd-sheet{position:relative;display:flex;align-items:center;justify-content:center;width:calc(612 * var(--dd-scale) * 1px);height:calc(792 * var(--dd-scale) * 1px);background:var(--dd-page);box-shadow:var(--dd-page-shadow,0 1px 2px rgb(0 0 0 / 0.05),0 12px 32px rgb(0 0 0 / 0.08));flex:none}
.dd-spinner{width:28px;height:28px;border:3px solid var(--dd-border);border-top-color:var(--dd-accent);border-radius:50%;animation:dd-spin .8s linear infinite}
.dd-loading-label{margin:0}
@keyframes dd-spin{to{transform:rotate(360deg)}}
.dd-viewer[data-drop] .dd-pages{background:var(--dd-drop)}
.dd-page{position:relative;width:calc(var(--pw) * var(--dd-scale) * 1px);height:calc(var(--ph) * var(--dd-scale) * 1px);margin-inline:auto;background:var(--dd-page);box-shadow:var(--dd-page-shadow,0 1px 2px rgb(0 0 0 / 0.05),0 12px 32px rgb(0 0 0 / 0.08));flex:none;user-select:none;cursor:text}
.dd-viewer[data-mode="view"] .dd-page{cursor:default}
.dd-element{pointer-events:auto;z-index:1;border:2px solid var(--dd-accent);background:color-mix(in srgb, var(--dd-accent) 12%, transparent);cursor:default;transform:rotate(var(--rot, 0deg));transform-origin:center center}
.dd-element[data-kind="text"]{cursor:text}
.dd-element[data-moving]{cursor:grabbing}
.dd-move-handle,.dd-resize-handle,.dd-rotate-handle,.dd-delete-handle{position:absolute;padding:0;border:1px solid var(--dd-border);background:var(--dd-raised);box-shadow:0 1px 3px rgb(0 0 0 / 0.12);pointer-events:auto;appearance:none;min-width:0}
.dd-move-handle{right:calc(100% + 3px);top:50%;transform:translateY(-50%);width:14px;height:22px;border-radius:4px;background:radial-gradient(circle,var(--dd-muted) 1.15px,transparent 1.25px) 2px 4px/5px 5px,var(--dd-raised);cursor:grab}
.dd-resize-handle{width:9px;height:9px;border-radius:2px;border-color:var(--dd-accent);background:#fff}
.dd-resize-handle[data-corner="nw"]{left:-5px;top:-5px;cursor:nwse-resize}
.dd-resize-handle[data-corner="ne"]{right:-5px;top:-5px;cursor:nesw-resize}
.dd-resize-handle[data-corner="sw"]{left:-5px;bottom:-5px;cursor:nesw-resize}
.dd-resize-handle[data-corner="se"]{right:-5px;bottom:-5px;cursor:nwse-resize}
.dd-rotate-handle{left:50%;bottom:calc(100% + 16px);width:12px;height:12px;margin-left:-6px;border-radius:50%;border-color:var(--dd-accent);cursor:grab}
.dd-rotate-handle::before{content:"";position:absolute;left:50%;top:100%;width:1px;height:16px;background:var(--dd-accent);transform:translateX(-50%)}
.dd-delete-handle,.dd-replace-handle{right:0;bottom:calc(100% + 4px);height:18px;border-radius:9px;border-color:var(--dd-accent);color:var(--dd-accent);font:700 12px/16px sans-serif;cursor:pointer;padding:0 5px;width:auto;min-width:18px}
.dd-delete-handle{width:18px;border-radius:50%;padding:0}
.dd-replace-handle{right:22px}
.dd-measure{position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);white-space:nowrap;padding:2px 6px;border-radius:4px;background:var(--dd-raised);border:1px solid var(--dd-border);color:var(--dd-fg);font:11px/1.3 var(--dd-font);box-shadow:0 1px 3px rgb(0 0 0 / 0.12);pointer-events:none;z-index:2}
.dd-move-handle:hover,.dd-resize-handle:hover,.dd-rotate-handle:hover,.dd-delete-handle:hover,.dd-replace-handle:hover{background-color:var(--dd-hover)}
.dd-move-handle:focus-visible,.dd-resize-handle:focus-visible,.dd-rotate-handle:focus-visible,.dd-delete-handle:focus-visible,.dd-replace-handle:focus-visible{outline:2px solid var(--dd-accent);outline-offset:1px}
.dd-element[data-moving] .dd-move-handle,.dd-element[data-moving] .dd-rotate-handle{cursor:grabbing}
.dd-page canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:multiply}
.dd-media{position:absolute;z-index:4;display:flex;align-items:center;background:#111;overflow:hidden}
.dd-media audio,.dd-media video{width:100%;height:100%;display:block}
.dd-page[data-media]{cursor:default}
.dd-page[data-oxide] canvas{visibility:hidden}
.dd-oxide{position:absolute;inset:0;width:100%;height:100%;border:0;background:var(--dd-page);pointer-events:none}
.dd-under,.dd-overlay,.dd-layer{position:absolute;inset:0;pointer-events:none}
.dd-under{z-index:0}
.dd-text{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;pointer-events:none}
.dd-overlay{z-index:2}
.dd-layer{z-index:3}
.dd-abs{position:absolute;left:calc(var(--x) * var(--dd-scale) * 1px);top:calc(var(--y) * var(--dd-scale) * 1px)}
.dd-mark{width:calc(var(--w) * var(--dd-scale) * 1px);height:calc(var(--h) * var(--dd-scale) * 1px)}
.dd-sel{background:var(--dd-sel)}
.dd-menu{z-index:6;display:flex;flex-direction:column;gap:4px;padding:6px;background:var(--dd-panel);border:1px solid var(--dd-border);border-radius:10px;box-shadow:0 8px 28px rgb(0 0 0 / 0.12),0 1px 2px rgb(0 0 0 / 0.06);pointer-events:auto}
.dd-menu[hidden]{display:none}
.dd-menu-actions{display:flex;gap:4px}
.dd-menu-actions[hidden]{display:none}
.dd-menu button{font:inherit;color:var(--dd-fg);border:1px solid transparent;background:transparent;border-radius:7px;height:28px;padding:0 9px;cursor:pointer}
.dd-menu button.dd-icon{width:28px;padding:0}
.dd-menu button:hover:not(:disabled){background:var(--dd-hover)}
.dd-menu button:focus-visible,.dd-menu textarea:focus-visible{outline:2px solid var(--dd-accent);outline-offset:1px}
.dd-menu form{display:flex;flex-direction:column;gap:4px}
.dd-menu form[hidden]{display:none}
.dd-menu textarea{font:inherit;color:var(--dd-fg);background:var(--dd-field);border:1px solid var(--dd-border);border-radius:var(--dd-radius);padding:4px 6px;width:16em;min-height:4.2em;resize:vertical}
.dd-menu [type=submit]{background:var(--dd-accent);color:var(--dd-on-accent);border-color:var(--dd-accent)}
.dd-note{pointer-events:auto;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0;border:0;border-radius:3px;background:var(--dd-accent);color:var(--dd-on-accent);cursor:pointer;z-index:4}
.dd-note svg{width:12px;height:12px;pointer-events:none}
.dd-note-card{z-index:6;width:16em;max-width:240px;padding:8px;background:var(--dd-panel);border:1px solid var(--dd-border);border-radius:var(--dd-radius);box-shadow:0 4px 16px rgb(0 0 0 / 0.16);pointer-events:auto}
.dd-note-card[hidden]{display:none}
.dd-note-card p{margin:0}
.dd-note-card .dd-muted{max-height:4.2em;overflow:auto;margin-bottom:6px}
.dd-hit{background:var(--dd-hit);outline:1px solid var(--dd-search)}
.dd-hit[data-current]{background:var(--dd-hit-current);outline-color:var(--dd-search-active)}
.dd-rev-insert,.dd-rev-replace{border-bottom:2px solid var(--dd-ins)}
.dd-rev-delete{background:linear-gradient(transparent 46%,var(--dd-del) 46%,var(--dd-del) 54%,transparent 54%)}
.dd-caret{z-index:2;width:1px;margin-left:-0.5px;height:calc(var(--h) * var(--dd-scale) * 1px);background:var(--dd-ink);pointer-events:none;animation:dd-blink 1.05s steps(1) infinite}
@keyframes dd-blink{50%{opacity:0}}
@media (prefers-reduced-motion: reduce){.dd-spinner,.dd-caret{animation:none}.dd-toolbar button{transition:none}}
.dd-viewer[data-motion="reduce"] .dd-spinner,.dd-viewer[data-motion="reduce"] .dd-caret{animation:none}
.dd-viewer[data-motion="reduce"] .dd-toolbar button{transition:none}
.dd-component{pointer-events:auto;z-index:1}
.dd-component[data-interactive="false"]{pointer-events:none}
.dd-component,.dd-component-body{user-select:text}
.dd-component-body{box-sizing:border-box}
.dd-content{box-sizing:border-box;background:var(--dd-page);color:var(--dd-ink);font:13px/1.35 var(--dd-font)}
.dd-content-image{display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:72px;border:1px dashed var(--dd-border);position:relative;overflow:hidden;color:var(--dd-muted)}
.dd-content-image img{max-width:100%;max-height:100%;object-fit:contain}
.dd-content-image input{position:absolute;inset:0;opacity:0;cursor:pointer}
.dd-content-table{border-collapse:collapse;width:100%;background:var(--dd-page)}
.dd-content-table th,.dd-content-table td{border:1px solid var(--dd-border);padding:4px 6px;min-width:3.5em;min-height:1.4em}
.dd-content-table th{background:color-mix(in srgb, var(--dd-fg) 6%, var(--dd-page));font-weight:600}
.dd-content-rule{border:0;border-top:1px solid var(--dd-ink);margin:8px 0}
.dd-content-break{border-top:1px dashed var(--dd-muted);color:var(--dd-muted);font-size:11px;text-align:center;padding-top:4px}
.dd-content-box,.dd-content-code,.dd-content-shape{border:1px solid var(--dd-border);padding:8px;min-height:48px}
.dd-content-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap}
.dd-content-shape{border-width:2px;border-color:var(--dd-accent);border-radius:4px;min-height:64px}
.dd-content-list{margin:0;padding-left:1.4em}
.dd-content [contenteditable="true"]{outline:none}
.dd-component[data-zoom="scale"]{width:calc(var(--w) * var(--dd-scale) * 1px);height:calc(var(--h) * var(--dd-scale) * 1px)}
.dd-component[data-zoom="scale"]>.dd-component-body{width:calc(var(--w) * var(--px-per-pt) * 1px);height:calc(var(--h) * var(--px-per-pt) * 1px);transform:scale(var(--dd-zoom));transform-origin:0 0}
.dd-component[data-auto-width][data-zoom="scale"]{width:max-content}
.dd-component[data-auto-width][data-zoom="scale"]>.dd-component-body{width:max-content}
.dd-component[data-auto-height][data-zoom="scale"]>.dd-component-body{height:auto}
.dd-component[data-zoom="resize"]{width:calc(var(--w) * var(--dd-scale) * 1px);height:calc(var(--h) * var(--dd-scale) * 1px)}
.dd-component[data-zoom="resize"]>.dd-component-body,.dd-component[data-zoom="fixed"]>.dd-component-body{width:100%;height:100%}
.dd-component[data-auto-height][data-zoom="resize"]>.dd-component-body{height:auto}
.dd-component[data-zoom="fixed"]{width:calc(var(--w) * var(--px-per-pt) * 1px);height:calc(var(--h) * var(--px-per-pt) * 1px)}
.dd-input{position:absolute;z-index:4;width:1px;margin:0;padding:0;border:0;opacity:0;resize:none;overflow:hidden;background:transparent;color:transparent;caret-color:transparent}
.dd-input.dd-composing{opacity:1;width:12em;min-height:1.2em;background:var(--dd-page);color:var(--dd-ink);border:1px solid var(--dd-accent);z-index:6;padding:0 2px}
.dd-panel{width:270px;flex:none;overflow:auto;background:var(--dd-panel);border-inline-start:1px solid var(--dd-border);padding:12px 14px;scrollbar-color:var(--dd-scrollbar) transparent}
.dd-panel[hidden]{display:none}
.dd-panel button{box-sizing:border-box;height:26px;font:inherit;font-weight:550;letter-spacing:-.011em;color:var(--dd-fg);border:1px solid transparent;background:transparent;border-radius:7px;padding:0 8px;cursor:pointer}
.dd-panel button:hover:not(:disabled){background:var(--dd-hover)}
.dd-panel button:focus-visible{outline:2px solid var(--dd-accent);outline-offset:1px}
.dd-viewer[data-theme^="high-contrast"] .dd-panel button{border-color:var(--dd-border);background:var(--dd-control)}
.dd-panel-heading{display:flex;align-items:center;gap:4px;margin:0 0 10px}
.dd-panel-heading h3{flex:1;margin:0}
.dd-panel-heading .dd-icon{width:26px;height:26px;padding:0;border:1px solid transparent;background:transparent;border-radius:7px;color:var(--dd-muted);cursor:pointer}
.dd-panel-heading .dd-icon:hover{background:var(--dd-hover);color:var(--dd-fg)}
.dd-viewer[data-theme^="high-contrast"] .dd-panel-heading .dd-icon{border-color:var(--dd-border);background:var(--dd-control)}
.dd-panel h3{font-size:11px;font-weight:650;text-transform:uppercase;letter-spacing:.06em;color:var(--dd-muted);margin:4px 0 8px}
.dd-view-menu{min-width:12em;max-height:min(70vh,28em);overflow:auto}
.dd-view-section{display:flex;flex-direction:column;gap:2px;padding:4px 0}
.dd-view-section+ .dd-view-section{border-top:1px solid var(--dd-border);margin-top:4px;padding-top:8px}
.dd-view-section strong{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--dd-muted);padding:2px 4px}
.dd-view-menu label{display:flex;gap:6px;align-items:center;padding:2px 4px;cursor:pointer}
.dd-view-menu label:has(input:disabled){opacity:.45;cursor:default}
.dd-muted{color:var(--dd-muted)}
.dd-rev{border:1px solid var(--dd-border);border-radius:var(--dd-radius);padding:6px 8px;margin-bottom:6px;cursor:pointer}
.dd-rev small{color:var(--dd-muted);display:block}
.dd-rev p{margin:4px 0}
.dd-rev ins{color:var(--dd-ins);text-decoration:underline}
.dd-rev del{color:var(--dd-del)}
.dd-rev button{font:inherit;font-size:12px;margin:4px 4px 0 0;border:1px solid var(--dd-border);background:var(--dd-control);color:var(--dd-fg);border-radius:var(--dd-radius);padding:1px 7px;cursor:pointer}
.dd-rev button.dd-icon{padding:3px}
.dd-rev [data-action="accept"]{color:var(--dd-ins)}
.dd-rev [data-action="reject"]{color:var(--dd-del)}
.dd-password button{font:inherit;color:var(--dd-fg);border:1px solid var(--dd-border);background:var(--dd-control);border-radius:var(--dd-radius);padding:3px 8px;cursor:pointer}
.dd-rev button:hover,.dd-password button:hover:not(.dd-primary){background:var(--dd-hover)}
.dd-password-backdrop{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgb(15 20 25 / 0.45)}
.dd-password{width:min(22em,92%);padding:16px 18px;border-radius:calc(var(--dd-radius) * 1.6);background:var(--dd-raised);border:1px solid var(--dd-border);box-shadow:0 8px 32px rgb(0 0 0 / 0.2);color:var(--dd-fg)}
.dd-password h2{margin:0 0 8px;font-size:15px;font-weight:600}
.dd-password p{margin:0 0 8px}
.dd-password input{width:100%;box-sizing:border-box;margin:4px 0 12px;padding:6px 8px;border:1px solid var(--dd-border);border-radius:var(--dd-radius);font:inherit;background:var(--dd-field);color:var(--dd-fg)}
.dd-password-actions{display:flex;gap:8px;justify-content:flex-end}
.dd-password-actions .dd-primary{background:var(--dd-accent);color:var(--dd-on-accent);border-color:var(--dd-accent)}
.dd-password-actions .dd-primary:hover{background:color-mix(in srgb, var(--dd-accent) 82%, #000)}
@media (pointer: coarse){.dd-toolbar input,.dd-toolbar select,.dd-password input{font-size:16px}}
`;

export function injectStyles(doc: Document): void {
  let style = doc.querySelector<HTMLStyleElement>("style[data-domdoc]");
  if (!style) {
    style = doc.createElement("style");
    style.dataset.domdoc = "";
    doc.head.appendChild(style);
  }
  if (style.textContent !== VIEWER_CSS) style.textContent = VIEWER_CSS;
}
