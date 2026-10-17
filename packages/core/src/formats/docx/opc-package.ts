import { strFromU8, unzipSync, zipSync } from "fflate";

export interface OpcMember {
  /** Normalized forward-slash path inside the package. */
  path: string;
  bytes: Uint8Array;
}

export interface OpcPackage {
  members: Map<string, Uint8Array>;
}

const MAX_MEMBER_BYTES = 8 * 1024 * 1024;
const MAX_MEMBERS = 512;

export function readOpcPackage(zipBytes: Uint8Array): OpcPackage {
  if (zipBytes.byteLength > MAX_MEMBER_BYTES * MAX_MEMBERS) {
    throw new OpcLimitError("Package exceeds expanded size limit");
  }
  const raw = unzipSync(zipBytes);
  const keys = Object.keys(raw);
  if (keys.length > MAX_MEMBERS) {
    throw new OpcLimitError("Too many OPC members");
  }
  const members = new Map<string, Uint8Array>();
  for (const path of keys) {
    const normalized = normalizePartPath(path);
    rejectUnsafePath(normalized);
    const bytes = raw[path];
    if (bytes.byteLength > MAX_MEMBER_BYTES) {
      throw new OpcLimitError(`Member too large: ${normalized}`);
    }
    members.set(normalized, bytes);
  }
  return { members };
}

export function writeOpcPackage(pkg: OpcPackage): Uint8Array {
  const record: Record<string, Uint8Array> = {};
  for (const [path, bytes] of pkg.members) {
    record[path] = bytes;
  }
  return zipSync(record, { level: 0 });
}

export function getMemberUtf8(pkg: OpcPackage, path: string): string {
  const bytes = pkg.members.get(normalizePartPath(path));
  if (!bytes) throw new OpcMissingPartError(path);
  return strFromU8(bytes);
}

export function setMemberUtf8(pkg: OpcPackage, path: string, text: string): void {
  const normalized = normalizePartPath(path);
  rejectUnsafePath(normalized);
  pkg.members.set(normalized, new TextEncoder().encode(text));
}

export function memberBytesIdentical(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export class OpcLimitError extends Error {
  readonly code = "opc-limit" as const;
}

export class OpcMissingPartError extends Error {
  readonly code = "opc-missing-part" as const;
}

function normalizePartPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function rejectUnsafePath(path: string): void {
  if (path.includes("..") || path.startsWith("/")) {
    throw new OpcLimitError(`Unsafe OPC path: ${path}`);
  }
}
