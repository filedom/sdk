import { describe, expect, it } from "vitest";
import { unwrapWasm } from "./bundle-cipher.js";
import { DomdocError } from "./errors.js";

const ENVELOPE = new Uint8Array([0x44, 0x44, 0x57, 0x31]);

async function seal(plain: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["encrypt"]);
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plain));
  const out = new Uint8Array(ENVELOPE.length + iv.length + body.length);
  out.set(ENVELOPE, 0);
  out.set(iv, ENVELOPE.length);
  out.set(body, ENVELOPE.length + iv.length);
  return out;
}

describe("unwrapWasm", () => {
  it("refuses plaintext wasm unless allowUnsealed is set", async () => {
    const plain = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
    const key = new Uint8Array(32);
    const refused = unwrapWasm(plain, key);
    await expect(refused).rejects.toBeInstanceOf(DomdocError);
    await expect(refused).rejects.toThrow(/plaintext wasm is refused/);
    const out = await unwrapWasm(plain, key, { allowUnsealed: true });
    expect(out).toBe(plain);
    expect(Array.from(out.subarray(0, 4))).toEqual([0x00, 0x61, 0x73, 0x6d]);
  });

  it("decrypts sealed bytes back to the wasm header", async () => {
    const plain = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x68, 0x69]);
    const key = new Uint8Array(32);
    key[0] = 7;
    const iv = new Uint8Array(12);
    iv[0] = 9;
    const sealed = await seal(plain, key, iv);
    expect(Array.from(sealed.subarray(0, 4))).not.toEqual([0x00, 0x61, 0x73, 0x6d]);
    expect(String.fromCharCode(sealed[0], sealed[1], sealed[2], sealed[3])).toBe("DDW1");
    const opened = await unwrapWasm(sealed, key);
    expect(Array.from(opened.subarray(0, 4))).toEqual([0x00, 0x61, 0x73, 0x6d]);
    expect(Array.from(opened)).toEqual(Array.from(plain));
  });

  it("rejects a bad content key", async () => {
    const plain = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
    const key = new Uint8Array(32);
    key[1] = 4;
    const sealed = await seal(plain, key, new Uint8Array(12));
    const wrong = new Uint8Array(32);
    wrong[1] = 5;
    await expect(unwrapWasm(sealed, wrong)).rejects.toThrow(/did not decrypt/);
  });
});
