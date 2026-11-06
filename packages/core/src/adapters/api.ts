/** One shape for every lazy adapter. FileDOM opens and writes through this, not through each library. */

export type AdapterKind = "document" | "book" | "image" | "audio" | "video" | "archive" | "mail";

export type AdapterRole = "open" | "edit" | "both";

export interface AdapterPage {
  width: number;
  height: number;
  text: string;
  pixels?: Uint8ClampedArray;
}

export interface AdapterImage {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

export interface AdapterAudio {
  sampleRate: number;
  channels: Float32Array[];
}

export interface AdapterEntry {
  name: string;
  bytes: Uint8Array;
}

export interface AdapterMessage {
  subject: string;
  from: string;
  body: string;
}

/** Bytes already in a form the engine can open. */
export interface AdapterDisplay {
  extension: string;
  bytes: Uint8Array;
}

export interface OpenedAdapterFile {
  name: string;
  extension: string;
  kind: AdapterKind;
  /** The bytes the user opened. Writers start from these. */
  source: Uint8Array;
  text?: string;
  pages?: AdapterPage[];
  image?: AdapterImage;
  audio?: AdapterAudio;
  entries?: AdapterEntry[];
  messages?: AdapterMessage[];
  display?: AdapterDisplay;
}

export interface AdapterModule {
  id: string;
  role: AdapterRole;
  extensions: readonly string[];
  /** Extensions this module can write. Omitted means the module's own suffixes. */
  writes?: readonly string[];
  open?(bytes: Uint8Array, name: string): Promise<OpenedAdapterFile>;
  write?(opened: OpenedAdapterFile, target: string, edited?: Uint8Array): Promise<Uint8Array>;
}
