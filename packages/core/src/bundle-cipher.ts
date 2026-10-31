/**
 * Unwrap a domdoc engine module before compile.
 *
 * A plain local bundle starts with the wasm magic `\0asm` and is returned
 * unchanged, so the private demo and host tests keep loading `pkg/`.
 * CDN bytes are an envelope:
 *
 *   4 bytes  ASCII "DDW1"
 *   12 bytes AES-GCM IV
 *   rest     ciphertext with the 16-byte authentication tag appended
 *
 * The content key is not in the object. The caller supplies the key from
 * `POST /bundle-ticket`.
 */
const WASM_MAGIC = [0x00, 0x61, 0x73, 0x6d] as const;
const ENVELOPE = [0x44, 0x44, 0x57, 0x31] as const;
const IV_BYTES = 12;
const TAG_BYTES = 16;

function toUint8(bytes: BufferSource): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes;
  if (ArrayBuffer.isView(bytes)) {
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  return new Uint8Array(bytes);
}

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}

function isCryptoKey(value: CryptoKey | BufferSource): value is CryptoKey {
  return typeof CryptoKey !== "undefined" && value instanceof CryptoKey;
}

async function importAesKey(key: CryptoKey | BufferSource): Promise<CryptoKey> {
  if (isCryptoKey(key)) return key;
  const raw = toUint8(key);
  if (raw.byteLength !== 32) throw new Error("wasm content key must be 32 bytes");
  const copy = new Uint8Array(raw);
  return crypto.subtle.importKey("raw", copy, { name: "AES-GCM" }, false, ["decrypt"]);
}

export async function unwrapWasm(bytes: BufferSource, key: CryptoKey | BufferSource): Promise<Uint8Array> {
  const view = toUint8(bytes);
  if (hasPrefix(view, WASM_MAGIC)) return view;
  if (view.length < ENVELOPE.length + IV_BYTES + TAG_BYTES || !hasPrefix(view, ENVELOPE)) {
    throw new Error("domdoc wasm ciphertext is not sealed");
  }
  const cryptoKey = await importAesKey(key);
  const iv = view.subarray(ENVELOPE.length, ENVELOPE.length + IV_BYTES);
  const data = view.subarray(ENVELOPE.length + IV_BYTES);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, data);
    return new Uint8Array(plain);
  } catch {
    throw new Error("domdoc wasm ciphertext did not decrypt");
  }
}
