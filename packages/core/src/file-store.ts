export type FileSource = "local" | "url" | "app" | "export";

export interface StoredFile {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly bytes: Uint8Array;
  readonly source: FileSource;
  readonly updatedAt: number;
}

export type FileInput = File | Blob | ArrayBuffer | Uint8Array;

export interface AddFileOptions {
  name?: string;
  type?: string;
  source?: FileSource;
  /** Replace the file with this id instead of adding a new one. */
  id?: string;
}

type Listener = (files: StoredFile[]) => void;

let counter = 0;
const nextId = () => `file-${Date.now().toString(36)}-${(counter++).toString(36)}`;

async function toBytes(input: FileInput): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(await input.arrayBuffer());
}

/**
 * In-memory files shared by the host SPA, the viewer and DOM components. The SPA adds
 * files (uploads, fetched URLs, app data); the viewer opens and re-saves them; components
 * receive the same store in their context and can list, read or subscribe to it.
 */
export class FileStore {
  private readonly files = new Map<string, StoredFile>();
  private readonly listeners = new Set<Listener>();

  async add(input: FileInput, options: AddFileOptions = {}): Promise<StoredFile> {
    const bytes = await toBytes(input);
    const named = typeof File !== "undefined" && input instanceof File ? input.name : undefined;
    const typed = typeof Blob !== "undefined" && input instanceof Blob ? input.type : undefined;
    const previous = options.id ? this.files.get(options.id) : undefined;
    const file: StoredFile = {
      id: options.id ?? nextId(),
      name: options.name ?? named ?? previous?.name ?? "document",
      type: options.type ?? typed ?? previous?.type ?? "application/octet-stream",
      bytes,
      source: options.source ?? (named ? "local" : "app"),
      updatedAt: Date.now(),
    };
    this.files.set(file.id, file);
    this.emit();
    return file;
  }

  async fetch(url: string, init?: RequestInit): Promise<StoredFile> {
    const response = await fetch(url, init);
    if (!response.ok) throw new Error(`fetch ${url}: ${response.status}`);
    const name = decodeURIComponent(new URL(url, globalThis.location?.href ?? "http://x/").pathname.split("/").pop() || "document");
    return this.add(await response.arrayBuffer(), {
      name,
      type: response.headers.get("content-type") ?? undefined,
      source: "url",
    });
  }

  get(id: string): StoredFile | undefined {
    return this.files.get(id);
  }

  list(): StoredFile[] {
    return [...this.files.values()];
  }

  remove(id: string): boolean {
    const removed = this.files.delete(id);
    if (removed) this.emit();
    return removed;
  }

  blob(id: string): Blob | undefined {
    const file = this.files.get(id);
    return file && new Blob([file.bytes as BlobPart], { type: file.type });
  }

  /** Subscribe to adds, replacements and removals. Returns an unsubscribe function. */
  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const files = this.list();
    for (const listener of this.listeners) listener(files);
  }
}
