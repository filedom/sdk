import { themeCaptureDeclarations, themeDefaultDeclarations, themeResolveDeclarations } from "./theme.js";

export const VIEWER_CSS = `
.dd-capture{display:flex;flex-direction:column;height:100%;min-height:0;min-width:0;${themeCaptureDeclarations()}}
.dd-viewer{${themeDefaultDeclarations("light")}${themeResolveDeclarations()}--dd-accent-tint:color-mix(in srgb, var(--dd-accent) 18%, var(--dd-panel));--dd-sel:color-mix(in srgb, var(--dd-accent) 35%, transparent);--dd-hit:color-mix(in srgb, var(--dd-search) 55%, transparent);--dd-hit-current:color-mix(in srgb, var(--dd-search-active) 70%, transparent);--dd-error-bg:color-mix(in srgb, var(--dd-del) 12%, var(--dd-panel));--dd-drop:color-mix(in srgb, var(--dd-accent) 18%, var(--dd-canvas));--dd-scrollbar:color-mix(in srgb, var(--dd-fg) 35%, transparent);--dd-on-accent:#f4f8fb;--dd-zoom:1;--dd-scale:1.333333;--px-per-pt:1.333333;color-scheme:light;
  display:flex;flex:1;flex-direction:column;min-height:0;min-width:0;font:14px/1.45 var(--dd-font);color:var(--dd-fg);background:var(--dd-bg);position:relative}
.dd-viewer[data-theme="dark"]{${themeDefaultDeclarations("dark")}--dd-accent-tint:color-mix(in srgb, var(--dd-accent) 25%, var(--dd-panel));--dd-scrollbar:color-mix(in srgb, var(--dd-fg) 28%, transparent);--dd-on-accent:#041018;color-scheme:dark}
.dd-viewer>style{display:none}
.dd-chrome{position:relative;z-index:30;display:flex;flex-direction:column;flex:none;background:var(--dd-panel);border-bottom:1px solid var(--dd-border);color:var(--dd-fg)}
.dd-workspace{display:flex;flex:1;min-height:0;min-width:0}
.dd-file-row{display:flex;align-items:center;gap:8px;min-width:0;min-height:36px;padding:4px 12px}
.dd-file-row .dd-file{max-width:24rem;margin-inline-end:0}
.dd-rail{display:flex;flex-direction:column;align-items:stretch;gap:2px;flex:none;width:44px;padding:6px 4px;overflow:auto;background:var(--dd-panel)}
.dd-rail.dd-activity{flex-direction:row;align-items:stretch;width:auto;gap:0;padding:0;overflow:hidden}
.dd-rail-left.dd-activity,.dd-rail-right.dd-activity{position:relative;z-index:6;overflow:visible;flex-direction:column;align-items:center;align-self:stretch;width:64px;min-height:0}
.dd-rail-left[hidden]{display:none}
.dd-rail[data-icons="hidden"]{width:28px}
.dd-rail[data-icons="hidden"] .dd-activity-icons,.dd-rail[data-icons="hidden"] .dd-activity-panel{display:none}
.dd-rail .dd-rail-tab{display:flex;align-items:center;justify-content:center;flex:none;width:100%;height:22px;margin:0;padding:0;border:0;border-bottom:1px solid var(--dd-border);border-radius:0;background:color-mix(in srgb, var(--dd-accent) 18%, var(--dd-panel));color:var(--dd-accent);cursor:pointer}
.dd-rail .dd-rail-tab svg{width:14px;height:14px}
.dd-rail .dd-rail-tab:hover{background:var(--dd-accent-tint)}
.dd-activity-icons{display:flex;flex-direction:column;align-items:center;gap:4px;width:64px;flex:1;min-height:0;padding:6px 4px;overflow:auto}
.dd-activity-icons button.dd-icon{flex-direction:column;width:56px;height:52px;gap:2px;padding:4px;border-radius:12px}
.dd-activity-icons button.dd-icon svg{width:20px;height:20px}
.dd-activity-icons button.dd-icon::after{content:attr(aria-label);max-width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:9px;font-weight:650;line-height:1.1;letter-spacing:.01em;text-align:center;white-space:normal}
.dd-activity-icons button[data-activity="errors"]{position:relative}
.dd-activity-icons button[data-activity="errors"]::after{content:"Errors"}
.dd-activity-icons button[data-activity="errors"][data-alert="true"]{color:var(--dd-del)}
.dd-error-badge{position:absolute;top:1px;right:6px;z-index:1;min-width:15px;height:15px;padding:0 3px;box-sizing:border-box;border-radius:8px;background:var(--dd-del);color:#fff;font-size:10px;font-weight:700;line-height:15px;text-align:center;pointer-events:none}
.dd-error-badge[hidden]{display:none}
.dd-activity-switcher{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 8px}
.dd-activity-switcher button.dd-icon,.dd-activity-tray button.dd-icon{flex-direction:column;width:52px;height:56px;gap:2px;padding:2px;justify-content:center}
.dd-activity-switcher button.dd-icon svg,.dd-activity-tray button.dd-icon svg{width:20px;height:20px}
.dd-activity-switcher button.dd-icon::after,.dd-activity-tray button.dd-icon::after{content:attr(aria-label);max-width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:9px;font-weight:650;line-height:1.1;text-align:center;white-space:normal}
.dd-activity-icons button[aria-pressed="true"],.dd-activity-switcher button[aria-pressed="true"]{background:var(--dd-accent-tint);color:var(--dd-accent)}
.dd-activity-panel{display:flex;flex-direction:column;width:16rem;min-height:0;overflow:auto;padding:8px 10px;border-inline-start:1px solid var(--dd-border);background:var(--dd-panel)}
.dd-rail-left .dd-activity-panel,.dd-rail-right .dd-activity-panel{position:absolute;top:0;height:100%;z-index:7;box-shadow:0 12px 32px color-mix(in srgb, var(--dd-fg) 16%, transparent)}
.dd-rail-left .dd-activity-panel{inset-inline-start:100%;border-inline-start:0;border-inline-end:1px solid var(--dd-border)}
.dd-rail-right .dd-activity-panel{inset-inline-end:100%;border-inline-end:0;border-inline-start:1px solid var(--dd-border)}
.dd-activity-tray button.dd-layout-choice,.dd-settings-options button.dd-layout-choice{flex:0 0 auto;flex-direction:column;width:5.6rem;height:4.6rem;gap:4px;padding:8px 6px;white-space:normal}
.dd-layout-choice svg{width:22px;height:22px}
.dd-layout-choice span{max-width:100%;font-size:11px;font-weight:650;line-height:1.15;text-align:center}
.dd-activity-tray button.dd-layout-choice.dd-icon::after,.dd-settings-options button.dd-layout-choice.dd-icon::after{content:none}
.dd-activity-tray [data-layout][aria-pressed="true"],.dd-settings-options button.dd-layout-choice[aria-checked="true"]{background:var(--dd-accent-tint);color:var(--dd-accent)}
.dd-settings-options button.dd-layout-choice{height:4.6rem;width:5.6rem;padding:8px 6px}
.dd-activity-tray[data-activity-tray="errors"]{flex-flow:column nowrap;align-items:stretch}
.dd-tool-shelf{display:flex;align-items:center;min-height:44px;padding:4px 12px 6px;border-top:1px solid color-mix(in srgb, var(--dd-border) 80%, transparent);background:color-mix(in srgb, var(--dd-canvas) 35%, var(--dd-panel))}
.dd-tool-shelf[hidden]{display:none}
.dd-tool-shelf .dd-activity-panel{position:static;width:auto;height:auto;flex:1;flex-direction:row;align-items:center;border:0;box-shadow:none;padding:0;background:transparent;overflow:visible}
.dd-tool-shelf .dd-activity-tray{flex-flow:row wrap;align-items:center;width:auto}
.dd-tool-shelf .dd-activity-title{display:none}
.dd-tool-shelf .dd-activity-title,.dd-tool-shelf .dd-activity-tray .dd-toolbar-group,.dd-tool-shelf .dd-activity-tray .dd-review-list,.dd-tool-shelf .dd-activity-tray button:not(.dd-icon){flex:0 1 auto}
.dd-activity-panel .dd-panel{width:auto;border:0;padding:0}
.dd-menu-nested label{display:flex;gap:8px;align-items:center;padding:4px 8px;cursor:pointer}
.dd-menu-nested label:has(input:disabled){opacity:.45;cursor:default}
.dd-menu-nested strong{display:block;padding:6px 8px 2px;font-size:11px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;color:var(--dd-muted)}
.dd-menu-radio[aria-checked="true"]{background:var(--dd-hover)}
.dd-review-row{display:block;width:100%;height:auto;min-height:30px;padding:6px 8px;text-align:start;white-space:normal}
.dd-activity-panel[hidden],.dd-activity-tray[hidden]{display:none}
.dd-activity-title{margin:0 0 8px;font-size:11px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--dd-muted)}
.dd-activity-tray{display:flex;flex-flow:row wrap;align-items:flex-start;align-content:flex-start;gap:4px}
.dd-activity-title,.dd-activity-tray .dd-toolbar-group,.dd-activity-tray .dd-review-list,.dd-activity-tray button:not(.dd-icon){flex:1 0 100%}
.dd-error-actions,.dd-error-list,.dd-error-row{flex:1 0 100%;width:100%}
.dd-error-list{display:flex;flex-direction:column;gap:8px}
.dd-error-row{display:flex;flex-direction:column;align-items:stretch;gap:6px;padding-top:8px;border-top:1px solid var(--dd-border)}
.dd-error-row p{margin:0;white-space:normal;line-height:1.45;text-align:start}
.dd-error-actions button,.dd-error-row button{box-sizing:border-box;width:100%;height:28px;font:inherit;font-weight:550;color:var(--dd-fg);border:1px solid var(--dd-border);background:transparent;border-radius:var(--dd-radius);cursor:pointer}
.dd-error-actions button:disabled{opacity:.38;cursor:default}
.dd-viewer[data-display="numbered"] .dd-pages,.dd-viewer[data-display="paginated"] .dd-pages{counter-reset:page}
.dd-viewer[data-display="numbered"] .dd-page,.dd-viewer[data-display="paginated"] .dd-page{counter-increment:page}
.dd-viewer[data-display="numbered"] .dd-page::after,.dd-viewer[data-display="paginated"] .dd-page::after{content:counter(page);position:absolute;z-index:2;top:8px;left:8px;min-width:1.4rem;padding:2px 6px;border-radius:var(--dd-radius);background:var(--dd-panel);color:var(--dd-muted);font:12px/1.4 var(--dd-font);text-align:center}
.dd-viewer[data-display="frame"] .dd-pages{margin:1rem;padding:1rem;border:1px solid var(--dd-border);background:var(--dd-canvas)}
.dd-rail-left{border-inline-end:1px solid var(--dd-border)}
.dd-rail-right{border-inline-start:1px solid var(--dd-border)}
.dd-rail[data-open="true"]{width:12.5rem}
.dd-rail button,.dd-rail select,.dd-rail .dd-theme{max-width:100%}
.dd-rail:not([data-open="true"]) .dd-find,.dd-rail:not([data-open="true"]) select,.dd-rail:not([data-open="true"]) .dd-theme,.dd-rail:not([data-open="true"]) .dd-toolbar-context button:not(.dd-icon),.dd-rail:not([data-open="true"]) .dd-toolbar-context input,.dd-rail:not([data-open="true"]) .dd-toolbar-context .dd-sep{display:none}
.dd-rail[data-open="true"]:not(.dd-activity) button.dd-icon{width:100%;justify-content:flex-start;gap:8px;padding:0 8px}
.dd-rail[data-open="true"]:not(.dd-activity) button.dd-icon::after{content:attr(aria-label);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500}
.dd-rail .dd-toolbar-context{flex-direction:column;align-items:stretch;border:0;background:transparent;padding:4px 0}
.dd-menu-folder{position:relative;overflow:visible}
.dd-close-dialog{position:absolute;z-index:8;inset:0;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:color-mix(in srgb, var(--dd-bg) 55%, transparent)}
.dd-close-dialog p{margin:0}
.dd-close-card{display:flex;flex-direction:column;gap:10px;width:min(22rem,100%);padding:14px;background:var(--dd-panel);border:1px solid var(--dd-border);border-radius:var(--dd-radius);box-shadow:0 12px 40px color-mix(in srgb, var(--dd-fg) 12%, transparent)}
.dd-close-dialog[hidden]{display:none}
.dd-close-actions{display:flex;justify-content:flex-end;gap:8px}
.dd-toolbar{display:flex;flex-wrap:wrap;align-items:center;column-gap:14px;row-gap:4px;padding:6px 12px;min-height:42px}
.dd-toolbar-app{position:relative;z-index:5;column-gap:2px;row-gap:0;padding:2px 8px;min-height:36px}
.dd-toolbar-options{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;padding:6px 12px;min-height:44px;border-top:1px solid var(--dd-border)}
.dd-option-group{display:inline-flex;align-items:center;gap:2px}
.dd-zoom{height:30px;padding:0 3px 0 10px;gap:1px;border:1px solid var(--dd-border);border-radius:999px;background:color-mix(in srgb, var(--dd-canvas) 50%, var(--dd-panel))}
.dd-zoom-mark{display:inline-flex;margin-inline-end:4px;color:var(--dd-muted)}
.dd-zoom-mark svg{width:16px;height:16px}
.dd-toolbar .dd-zoom button{height:24px;min-width:24px;border-radius:999px;padding:0 8px}
.dd-toolbar-options [data-action="zoomReset"]{min-width:3.2em;font-variant-numeric:tabular-nums;font-weight:650}
.dd-toolbar .dd-zoom input[data-zoom-edit]{box-sizing:border-box;width:4.4em;height:24px;margin:0;padding:0 6px;border:0;border-radius:999px;background:var(--dd-field);color:var(--dd-fg);font:inherit;font-weight:650;font-variant-numeric:tabular-nums;text-align:center}
.dd-toolbar .dd-zoom input[data-zoom-edit]:focus-visible{outline:2px solid var(--dd-accent);outline-offset:1px}
.dd-selection-slot:empty,.dd-selection-bar[hidden]{display:none}
.dd-selection-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:4px 12px;border-top:1px solid var(--dd-border);background:color-mix(in srgb,var(--dd-canvas) 42%,var(--dd-panel))}
.dd-selection-bar.dd-abs{z-index:6;width:max-content;max-width:20rem;border:1px solid var(--dd-border);border-radius:var(--dd-radius);background:var(--dd-panel);box-shadow:0 8px 24px color-mix(in srgb,var(--dd-fg) 16%,transparent);padding:4px 6px}
.dd-toolbar-tools{flex-wrap:wrap;column-gap:4px;row-gap:4px;padding:4px 10px;min-height:40px;border-top:1px solid var(--dd-border)}
.dd-find{position:absolute;z-index:9;top:52px;left:12px;display:flex;flex-direction:column;align-items:stretch;gap:14px;width:min(22rem,calc(100% - 24px));padding:14px;background:var(--dd-panel);color:var(--dd-fg);border:1px solid var(--dd-border);border-radius:calc(var(--dd-radius) + 2px);box-shadow:0 16px 40px color-mix(in srgb,var(--dd-fg) 18%,transparent)}
.dd-find[hidden]{display:none}
.dd-find-head{display:flex;align-items:center;gap:8px}
.dd-find-head strong,.dd-find-head h2{flex:1;margin:0}
.dd-find .dd-find-head{min-height:32px;margin:0 0 2px;padding:0 0 12px;border-bottom:1px solid var(--dd-border);cursor:grab}
.dd-find .dd-find-head strong{font-size:13px;font-weight:650;letter-spacing:-.011em}
.dd-find-count{min-width:4.5em;font-size:12px;font-weight:600;color:var(--dd-muted);font-variant-numeric:tabular-nums;text-align:end}
.dd-find-count:empty{display:none}
.dd-find-field{display:flex;flex-direction:column;gap:8px}
.dd-find-steps,.dd-find-actions{display:flex;gap:8px}
.dd-find-steps button{flex:1}
.dd-find-actions{justify-content:flex-end}
.dd-find input{width:100%;box-sizing:border-box;height:32px;margin:0;padding:0 10px;border:1px solid var(--dd-border);border-radius:var(--dd-radius);background:var(--dd-field);color:var(--dd-fg);font:inherit;appearance:none}
.dd-find input::placeholder{color:var(--dd-muted)}
.dd-find input:hover:not(:disabled){border-color:color-mix(in srgb,var(--dd-fg) 24%,var(--dd-border))}
.dd-find input:focus-visible{outline:2px solid var(--dd-accent);outline-offset:1px}
.dd-find button{box-sizing:border-box;height:32px;min-width:32px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 12px;border:1px solid var(--dd-border);border-radius:var(--dd-radius);background:var(--dd-control);color:var(--dd-fg);font:inherit;font-weight:550;letter-spacing:-.011em;cursor:pointer}
.dd-find button:hover:not(:disabled){background:var(--dd-hover)}
.dd-find button:disabled{opacity:.38;cursor:default}
.dd-find button:focus-visible{outline:2px solid var(--dd-accent);outline-offset:1px}
.dd-find button svg{width:14px;height:14px;flex:none}
.dd-find-close{width:32px;padding:0;font-size:18px;line-height:1}
.dd-find [data-action="replaceAll"]{background:var(--dd-accent);border-color:var(--dd-accent);color:var(--dd-on-accent)}
.dd-find [data-action="replaceAll"]:hover:not(:disabled){background:color-mix(in srgb,var(--dd-accent) 82%,#000)}
.dd-settings-dialog{position:fixed;z-index:80;inset:0;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:color-mix(in srgb,var(--dd-fg) 28%,transparent);color:var(--dd-fg)}
.dd-settings-dialog .dd-close-card{width:min(64rem,100%);height:min(42rem,calc(100vh - 3rem));max-height:calc(100vh - 3rem);min-height:0;overflow:hidden;padding:0;gap:0;border-radius:calc(var(--dd-radius) + 4px)}
.dd-settings-dialog button,.dd-settings-dialog select,.dd-settings-dialog input{font:inherit;color:var(--dd-fg)}
.dd-settings-head{display:flex;align-items:center;gap:12px;flex:none;padding:16px 18px;border-bottom:1px solid var(--dd-border)}
.dd-settings-head h2{flex:1;margin:0;font-size:18px;font-weight:650;letter-spacing:-.02em}
.dd-settings-close{height:32px;padding:0 12px;border:1px solid var(--dd-border);border-radius:var(--dd-radius);background:var(--dd-control);cursor:pointer;font-weight:550}
.dd-settings-close:hover{background:var(--dd-hover)}
.dd-settings-body{display:flex;flex:1;min-height:0}
.dd-settings-tabs{display:flex;flex-direction:column;gap:2px;width:12.5rem;flex:none;margin:0;padding:10px;border-inline-end:1px solid var(--dd-border);background:color-mix(in srgb,var(--dd-canvas) 65%,var(--dd-panel))}
.dd-settings-tab{display:flex;align-items:center;width:100%;height:34px;padding:0 10px;border:0;border-radius:var(--dd-radius);background:transparent;font-weight:550;text-align:start;cursor:pointer}
.dd-settings-tab:hover{background:var(--dd-hover)}
.dd-settings-tab[aria-selected="true"]{background:var(--dd-accent-tint);color:var(--dd-accent)}
.dd-settings-tab:focus-visible,.dd-settings-close:focus-visible,.dd-settings-options button:focus-visible,.dd-settings-field select:focus-visible{outline:2px solid var(--dd-accent);outline-offset:1px}
.dd-settings-panels{flex:1;min-width:0;overflow:auto;padding:20px 24px 28px}
.dd-settings-panel[hidden]{display:none}
.dd-settings-panel h3{margin:16px 0 6px;font-size:11px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--dd-muted)}
.dd-settings-panel h3:first-child{margin-top:0}
.dd-settings-note{margin:0 0 14px;max-width:42rem;font-size:13px;line-height:1.45;color:var(--dd-muted)}
.dd-settings-field{display:flex;flex-direction:column;align-items:flex-start;gap:6px;max-width:18rem;margin:0 0 18px}
.dd-settings-field span{font-size:13px;font-weight:550}
.dd-settings-field select{width:100%;height:36px;box-sizing:border-box;padding:0 10px;border:1px solid var(--dd-border);border-radius:var(--dd-radius);background:var(--dd-field)}
.dd-settings-dialog .dd-theme-panel{position:static;z-index:auto;top:auto;right:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 32px;width:auto;max-height:none;overflow:visible;padding:0;border:0;box-shadow:none;background:transparent}
.dd-settings-dialog .dd-theme-row{min-height:32px}
.dd-settings-lock{display:flex;align-items:center;gap:8px;min-height:32px;margin:0 0 12px;cursor:pointer}
.dd-settings-dialog .dd-view-section{display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:2px 16px;padding:0}
.dd-settings-dialog .dd-view-section label{display:flex;align-items:center;gap:8px;min-height:32px;margin:0;cursor:pointer}
.dd-settings-dialog .dd-view-section label:has(input:disabled){opacity:.45;cursor:default}
.dd-settings-options{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}
.dd-settings-options button{height:34px;padding:0 14px;border:1px solid var(--dd-border);border-radius:var(--dd-radius);background:var(--dd-field);font-weight:550;cursor:pointer}
.dd-settings-options button.dd-layout-choice{height:4.6rem;width:5.6rem;padding:8px 6px}
.dd-settings-options button:hover:not(:disabled){background:var(--dd-hover)}
.dd-settings-options button[aria-checked="true"],.dd-settings-options button[aria-pressed="true"]{background:var(--dd-accent-tint);color:var(--dd-accent);border-color:color-mix(in srgb,var(--dd-accent) 35%,transparent)}
.dd-settings-options button:disabled{opacity:.45;cursor:default}
@media (max-width:800px){.dd-settings-body{flex-direction:column}.dd-settings-tabs{flex-direction:row;width:auto;overflow:auto;border-inline-end:0;border-bottom:1px solid var(--dd-border)}.dd-settings-tab{width:auto;flex:none}.dd-settings-dialog .dd-theme-panel{grid-template-columns:1fr}}
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
.dd-toolbar button{box-sizing:border-box;height:30px;min-width:30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;background:transparent;border-radius:var(--dd-radius);padding:0 10px;cursor:pointer;transition:background-color .12s ease,color .12s ease,border-color .12s ease}
.dd-toolbar button[hidden],.dd-toolbar select[hidden],.dd-toolbar input[hidden]{display:none}
.dd-toolbar button:not(.dd-icon){font-weight:500;letter-spacing:-.011em}
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
.dd-toolbar input[type=search],.dd-toolbar input[type=text],.dd-toolbar select{box-sizing:border-box;height:30px;border:1px solid color-mix(in srgb,var(--dd-border) 88%,transparent);border-radius:var(--dd-radius);background-color:var(--dd-field)}
.dd-toolbar select{appearance:none;padding:0 22px 0 8px;background-image:linear-gradient(45deg,transparent 50%,var(--dd-muted) 50%),linear-gradient(135deg,var(--dd-muted) 50%,transparent 50%);background-position:calc(100% - 13px) 50%,calc(100% - 8px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;cursor:pointer}
.dd-toolbar select:hover:not(:disabled),.dd-toolbar input[type=search]:hover:not(:disabled){border-color:color-mix(in srgb,var(--dd-fg) 24%,var(--dd-border))}
.dd-toolbar [data-action="font"]{width:9.5em;font-weight:520}
.dd-toolbar [data-action="size"],.dd-toolbar [data-action="spacing"]{width:4.4em;font-variant-numeric:tabular-nums;text-align:start}
.dd-toolbar [data-action="mode"]{min-width:7.25em}
.dd-toolbar [data-action="theme"]{min-width:9.25em;flex:none;font-weight:500}
.dd-theme{position:relative;display:inline-flex;align-items:center;gap:4px}
.dd-theme-panel{position:absolute;z-index:8;top:calc(100% + 6px);right:0;width:min(22rem,calc(100vw - 24px));max-height:min(70vh,28rem);overflow:auto;padding:10px 12px;background:var(--dd-panel);color:var(--dd-fg);border:1px solid var(--dd-border);border-radius:var(--dd-radius);box-shadow:0 12px 32px rgba(7,19,28,.16)}
.dd-theme-panel[hidden]{display:none}
.dd-theme-panel h3{margin:8px 0 6px;font-size:11px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--dd-muted)}
.dd-theme-panel h3:first-child{margin-top:0}
.dd-theme-panel p{margin:0 0 8px;font-size:12px;line-height:1.4;color:var(--dd-muted)}
.dd-theme-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:28px}
.dd-theme-row span{font-size:13px}
.dd-theme-row input[type=color]{width:28px;height:22px;padding:0;border:1px solid var(--dd-border);border-radius:4px;background:transparent;cursor:pointer}
.dd-theme-row input[type=text]{width:9.5rem;height:26px;box-sizing:border-box;border:1px solid var(--dd-border);border-radius:var(--dd-radius);background:var(--dd-field);color:var(--dd-fg);padding:0 6px;font:inherit;font-size:12px}
.dd-toolbar input[type=search],.dd-toolbar input[type=text]{width:11em;padding:0 10px}
.dd-toolbar input[type=search]::placeholder{color:var(--dd-muted)}
.dd-sep{width:1px;align-self:stretch;background:var(--dd-border);margin:0 2px}
.dd-menu-sep{height:1px;margin:4px 6px;background:var(--dd-border);flex:none}
.dd-app-menu{position:absolute;top:calc(100% + 4px);inset-inline-start:0;z-index:8;min-width:12.5em;overflow:visible;align-items:stretch;padding:4px}
.dd-app-menu[hidden]{display:none}
.dd-app-menu button,.dd-app-menu select,.dd-app-menu input[type=search]{width:100%;justify-content:flex-start}
.dd-app-menu select,.dd-app-menu input[type=search]{min-width:0}
.dd-menu-command{gap:8px;padding:0 8px}
.dd-menu-command .dd-menu-label{flex:1;text-align:start}
.dd-app-menu .dd-view-menu{position:static;z-index:auto;margin-top:4px;min-width:0;max-height:min(50vh,22em);overflow:auto;box-shadow:none;border:0;border-top:1px solid var(--dd-border);border-radius:0;padding:4px 0 0}
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
.dd-tabs{display:flex;align-items:flex-end;gap:4px;min-width:0;flex:1;overflow:auto}
.dd-tabs[hidden]{display:none}
.dd-tab{display:inline-flex;align-items:center;gap:6px;max-width:16rem;height:32px;margin:0;padding:0 6px 0 8px;border:1px solid transparent;border-bottom:0;border-radius:8px 8px 0 0;background:transparent;color:var(--dd-muted);font-weight:550;cursor:pointer}
.dd-tab[aria-selected="true"]{background:var(--dd-canvas);border-color:var(--dd-border);color:var(--dd-fg)}
.dd-tab button{box-sizing:border-box;width:18px;height:18px;min-width:18px;padding:0;border:0;border-radius:4px;background:transparent;color:inherit;cursor:pointer}
.dd-tab button svg{width:12px;height:12px}
.dd-tab button:hover{background:var(--dd-hover)}
.dd-tab[data-dragging]{opacity:0.55}
.dd-file-icon{display:inline-flex;flex:none;color:var(--dd-muted)}
.dd-file-icon svg{display:block}
.dd-file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dd-status{margin-inline-start:auto;padding-inline-start:12px;color:var(--dd-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40%;user-select:text;cursor:text}
.dd-file-actions{display:inline-flex;align-items:center;gap:2px;margin-inline-start:auto;flex:none}
.dd-file-actions button{box-sizing:border-box;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid transparent;border-radius:var(--dd-radius);background:transparent;color:var(--dd-fg);cursor:pointer}
.dd-file-actions button:hover{background:var(--dd-hover)}
.dd-file-actions svg{width:16px;height:16px}
.dd-status[data-tone=error]{color:var(--dd-del)}
.dd-body{display:flex;flex:1;min-height:0}
.dd-pages{position:relative;flex:1;overflow:auto;padding:28px 24px;display:flex;flex-direction:column;align-items:flex-start;gap:28px;outline:none;background:var(--dd-canvas);scrollbar-color:var(--dd-scrollbar) transparent}
.dd-empty{margin:auto;text-align:center;color:var(--dd-fg);border:1px dashed color-mix(in srgb,var(--dd-accent) 48%,var(--dd-border));border-radius:var(--dd-radius);padding:48px 56px;cursor:pointer;background:var(--dd-panel)}
.dd-empty [data-drop-text]+p{color:var(--dd-muted)}
.dd-empty:hover,.dd-empty:focus-visible{border-color:var(--dd-accent);background:color-mix(in srgb,var(--dd-accent) 14%,var(--dd-panel));outline:none}
.dd-loading{margin:auto;display:flex;flex-direction:column;align-items:center;gap:12px;color:var(--dd-muted)}
.dd-loading[hidden]{display:none}
.dd-trial{flex:none;padding:6px 12px;text-align:center;font-weight:650;background:var(--dd-accent-tint);color:var(--dd-fg)}
.dd-trial[hidden]{display:none}
.dd-sheet{position:relative;display:flex;align-items:center;justify-content:center;width:calc(612 * var(--dd-scale) * 1px);height:calc(792 * var(--dd-scale) * 1px);background:var(--dd-page);box-shadow:var(--dd-page-shadow,0 1px 2px rgb(0 0 0 / 0.05),0 12px 32px rgb(0 0 0 / 0.08));flex:none}
.dd-spinner{width:28px;height:28px;border:3px solid var(--dd-border);border-top-color:var(--dd-accent);border-radius:50%;animation:dd-spin .8s linear infinite}
.dd-loading-label{margin:0}
@keyframes dd-spin{to{transform:rotate(360deg)}}
.dd-viewer[data-drop] .dd-pages{background:var(--dd-drop)}
.dd-page{position:relative;width:calc(var(--pw) * var(--dd-scale) * 1px);height:calc(var(--ph) * var(--dd-scale) * 1px);margin-inline:auto;background:var(--dd-page);box-shadow:var(--dd-page-shadow,0 1px 2px rgb(0 0 0 / 0.05),0 12px 32px rgb(0 0 0 / 0.08));flex:none;user-select:none;cursor:default}
.dd-element{pointer-events:none;z-index:1;border:2px solid var(--dd-accent);background:color-mix(in srgb, var(--dd-accent) 12%, transparent);cursor:pointer;transform:rotate(var(--rot, 0deg));transform-origin:center center}
.dd-element[data-kind="text"][data-editing]{cursor:text}
.dd-element[data-moving]{cursor:grabbing}
.dd-move-handle,.dd-resize-handle,.dd-rotate-handle,.dd-delete-handle,.dd-replace-handle{position:absolute;box-sizing:border-box;padding:0;border:1px solid var(--dd-border);background:var(--dd-raised);box-shadow:0 1px 3px rgb(0 0 0 / 0.12);pointer-events:auto;appearance:none;min-width:0}
.dd-move-handle{right:calc(100% + 6px);top:50%;transform:translateY(-50%);width:14px;height:22px;border-radius:4px;background:radial-gradient(circle,var(--dd-muted) 1.15px,transparent 1.25px) 2px 4px/5px 5px,var(--dd-raised);cursor:grab}
.dd-resize-handle{width:9px;height:9px;border-radius:2px;border-color:var(--dd-accent);background:#fff}
.dd-resize-handle[data-corner="nw"]{left:-12px;top:-12px;cursor:nwse-resize}
.dd-resize-handle[data-corner="ne"]{right:-12px;top:-12px;cursor:nesw-resize}
.dd-resize-handle[data-corner="sw"]{left:-12px;bottom:-12px;cursor:nesw-resize}
.dd-resize-handle[data-corner="se"]{right:-12px;bottom:-12px;cursor:nwse-resize}
.dd-rotate-handle{left:50%;bottom:calc(100% + 16px);width:12px;height:12px;margin-left:-6px;border-radius:50%;border-color:var(--dd-accent);cursor:grab}
.dd-rotate-handle::before{content:"";position:absolute;left:50%;top:100%;width:1px;height:16px;background:var(--dd-accent);transform:translateX(-50%)}
.dd-delete-handle,.dd-replace-handle{right:0;bottom:calc(100% + 4px);height:18px;border-radius:9px;border-color:var(--dd-accent);color:var(--dd-accent);font:700 12px/16px sans-serif;cursor:pointer;padding:0 5px;width:auto;min-width:18px}
.dd-delete-handle{width:18px;border-radius:50%;padding:0}
.dd-replace-handle{right:22px}
.dd-measure{position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);white-space:nowrap;padding:2px 6px;border-radius:4px;background:var(--dd-raised);border:1px solid var(--dd-border);color:var(--dd-fg);font:11px/1.3 var(--dd-font);box-shadow:0 1px 3px rgb(0 0 0 / 0.12);pointer-events:none;z-index:2}
.dd-move-handle:hover,.dd-resize-handle:hover,.dd-rotate-handle:hover,.dd-delete-handle:hover,.dd-replace-handle:hover{background-color:var(--dd-hover)}
.dd-move-handle:focus-visible,.dd-resize-handle:focus-visible,.dd-rotate-handle:focus-visible,.dd-delete-handle:focus-visible,.dd-replace-handle:focus-visible{outline:2px solid var(--dd-accent);outline-offset:1px}
.dd-element[data-moving] .dd-move-handle,.dd-element[data-moving] .dd-rotate-handle{cursor:grabbing}
.dd-page canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;background:var(--dd-canvas-fill,transparent)}
.dd-media{position:absolute;z-index:4;display:flex;flex-direction:column;align-items:stretch;background:#111;overflow:hidden}
.dd-media-pick{flex:none;height:22px;border:0;background:transparent;color:#fff;font:12px/22px var(--dd-font);cursor:pointer}
.dd-viewer[data-mode="view"] .dd-media-pick{display:none}
.dd-media audio,.dd-media video{width:100%;flex:1;min-height:0;display:block}
.dd-media[data-selected]{outline:2px solid var(--dd-accent);outline-offset:2px}
.dd-page[data-media]{cursor:default}
.dd-timeline{width:min(100%,720px);margin:4px auto 12px;padding:0 8px}
.dd-timeline[hidden]{display:none}
.dd-track{position:relative;height:48px;border-radius:8px;background:color-mix(in srgb,var(--dd-muted) 16%,var(--dd-page));border:1px solid var(--dd-border)}
.dd-clip{position:absolute;top:6px;bottom:6px;display:flex;align-items:stretch;overflow:hidden;min-width:28px;border-radius:6px;border:1px solid var(--dd-accent);background:color-mix(in srgb,var(--dd-accent) 28%,var(--dd-page));box-sizing:border-box}
.dd-clip[data-active]{box-shadow:inset 0 0 0 1px var(--dd-accent)}
.dd-clip-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-self:center;padding:0 4px;font:12px/1.2 var(--dd-font);pointer-events:none}
.dd-clip-edge{flex:none;width:8px;padding:0;border:0;background:var(--dd-accent);cursor:ew-resize}
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
.dd-menu{z-index:6;display:flex;flex-direction:column;gap:4px;padding:6px;background:var(--dd-panel);border:1px solid var(--dd-border);border-radius:var(--dd-radius);box-shadow:none;pointer-events:auto}
.dd-menu.dd-menu-nested{position:absolute;inset-inline-start:calc(100% - 4px);top:0;min-width:11rem;z-index:9;overflow:visible;box-shadow:0 12px 32px color-mix(in srgb, var(--dd-fg) 16%, transparent)}
.dd-menu-folder>.dd-menu-command[aria-expanded="true"]{background:var(--dd-hover)}
.dd-menu-folder>.dd-menu-command::after{content:"";width:.4rem;height:.4rem;margin-inline-start:8px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg);flex:none}
.dd-menu[hidden]{display:none}
.dd-menu-actions{display:flex;gap:4px}
.dd-menu-actions[hidden]{display:none}
.dd-menu button{font:inherit;color:var(--dd-fg);border:1px solid transparent;background:transparent;border-radius:var(--dd-radius);height:28px;padding:0 9px;cursor:pointer}
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
.dd-rev-insert,.dd-rev-replace{border-bottom:2px solid var(--dd-ins);background:color-mix(in srgb,var(--dd-ins) 22%,transparent)}
.dd-rev-delete{background:linear-gradient(transparent 46%,var(--dd-del) 46%,var(--dd-del) 54%,transparent 54%)}
.dd-caret{z-index:2;width:var(--dd-caret-width,1px);margin-left:calc(var(--dd-caret-width,1px) * -0.5);height:max(1px, calc(var(--h) * var(--dd-scale) * 1px));background:var(--dd-caret);pointer-events:none;animation:dd-blink 1.05s steps(1) infinite}
@keyframes dd-blink{50%{opacity:0}}
@media (prefers-reduced-motion: reduce){.dd-spinner,.dd-caret,.dd-code-caret{animation:none}.dd-toolbar button{transition:none}}
.dd-viewer[data-motion="reduce"] .dd-spinner,.dd-viewer[data-motion="reduce"] .dd-caret,.dd-viewer[data-motion="reduce"] .dd-code-caret{animation:none}
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
.dd-content-box,.dd-content-shape{border:1px solid var(--dd-border);padding:8px;min-height:48px}
.dd-code-element{display:grid;grid-template-columns:max-content minmax(0,1fr);width:100%;box-sizing:border-box;background:var(--dd-page);color:var(--dd-ink);font:var(--dd-code-size,13px)/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;border:1px solid var(--dd-border)}
.dd-code-gutter{padding:0.75rem 0.65rem;text-align:end;color:var(--dd-muted);background:color-mix(in srgb, var(--dd-ink) 5%, var(--dd-page));border-inline-end:1px solid var(--dd-border);user-select:none;white-space:pre;pointer-events:none}
.dd-code-body{position:relative;min-width:0}
.dd-code-text{margin:0;padding:0.75rem 0.85rem;white-space:pre;tab-size:2;overflow:auto;min-height:1.55em}
.dd-code-text[contenteditable="true"]{outline:none}
.dd-code-marks{position:absolute;inset:0;pointer-events:none}
.dd-code-caret{position:absolute;width:var(--dd-caret-width,1px);background:var(--dd-caret);pointer-events:none;animation:dd-blink 1.05s steps(1) infinite}
.dd-code-sel{position:absolute;background:var(--dd-sel)}
.dd-code-hit{position:absolute;background:var(--dd-hit)}
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
.dd-panel-heading{display:flex;align-items:center;gap:4px;margin:0 0 10px}
.dd-panel-heading h3{flex:1;margin:0}
.dd-panel-heading .dd-icon{width:26px;height:26px;padding:0;border:1px solid transparent;background:transparent;border-radius:7px;color:var(--dd-muted);cursor:pointer}
.dd-panel-heading .dd-icon:hover{background:var(--dd-hover);color:var(--dd-fg)}
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
  let style = doc.querySelector<HTMLStyleElement>("style[data-filedom]");
  if (!style) {
    style = doc.createElement("style");
    style.dataset.filedom = "";
    doc.head.appendChild(style);
  }
  if (style.textContent !== VIEWER_CSS) style.textContent = VIEWER_CSS;
}
