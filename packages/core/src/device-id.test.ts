// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { DEVICE_HEADER, DEVICE_ID_KEY, applyDeviceHeader, deviceId, isDeviceId } from "./device-id.js";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, String(value));
    },
  };
}

describe("device id", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("stores one id under deviceid and reuses it", () => {
    const store = memoryStorage();
    const first = deviceId(store);
    expect(isDeviceId(first)).toBe(true);
    expect(deviceId(store)).toBe(first);
    expect(store.getItem(DEVICE_ID_KEY)).toBe(first);
  });

  it("gives each store its own id", () => {
    const ids = new Set(Array.from({ length: 20 }, () => deviceId(memoryStorage())));
    expect(ids.size).toBe(20);
    for (const id of ids) expect(isDeviceId(id)).toBe(true);
  });

  it("replaces a stored value that is not an id", () => {
    const store = memoryStorage();
    store.setItem(DEVICE_ID_KEY, "shared");
    const created = deviceId(store);
    expect(isDeviceId(created)).toBe(true);
    expect(created).not.toBe("shared");
    expect(deviceId(store)).toBe(created);
  });

  it("sets the device header from the stored id", () => {
    const store = memoryStorage();
    const headers = new Headers();
    applyDeviceHeader(headers, store);
    expect(headers.get(DEVICE_HEADER)).toBe(deviceId(store));
  });

  it("reads the browser store when none is passed", () => {
    expect(localStorage.getItem(DEVICE_ID_KEY)).toBeNull();
    const id = deviceId();
    expect(localStorage.getItem(DEVICE_ID_KEY)).toBe(id);
    expect(deviceId()).toBe(id);
  });
});
