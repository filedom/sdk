/** Logical format modules (implementation update §3 — descriptors do not import implementations). */

export type FormatModuleId =
  | "common-shell"
  | "docx-adapter"
  | "pdf-display"
  | "pdf-writer"
  | "legacy-doc-importer"
  | "package-adapter";

export type FormatAdapterKind = "docx" | "pdf" | "legacy-doc" | "package" | "none";

export interface FormatModuleDescriptor {
  id: FormatModuleId;
  label: string;
  /** Human-readable trigger (not a dynamic import). */
  loadTrigger: string;
}

export const FORMAT_MODULE_DESCRIPTORS: readonly FormatModuleDescriptor[] = [
  { id: "common-shell", label: "Common shell", loadTrigger: "SDK mount / empty viewer" },
  { id: "docx-adapter", label: "DOCX adapter", loadTrigger: "Open DOCX or .domdoc Word payload" },
  { id: "pdf-display", label: "PDF display", loadTrigger: "Open PDF for view" },
  { id: "pdf-writer", label: "PDF writer", loadTrigger: "First native PDF mutation/export" },
  {
    id: "legacy-doc-importer",
    label: "Legacy DOC importer",
    loadTrigger: "Open binary .doc (Word 97–2003 subset)",
  },
  { id: "package-adapter", label: "Package adapter", loadTrigger: "Open .domdoc package" },
] as const;
