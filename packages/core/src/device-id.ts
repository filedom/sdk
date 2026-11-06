/** localStorage key. One id per browser. It is not rotated. */
export const DEVICE_ID_KEY = "deviceid";

/** Sent on API and bundle requests. An open or a conversion stores the same value. */
export const DEVICE_HEADER = "x-filedom-device";

/** UUID from `crypto.randomUUID`. Two browsers do not share one. */
export const DEVICE_ID_PATTERN =
  "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

const DEVICE_ID = new RegExp(DEVICE_ID_PATTERN, "i");

export function isDeviceId(value: string | null | undefined): value is string {
  return typeof value === "string" && DEVICE_ID.test(value);
}

function storageOrNull(): Storage | null {
  try {
    const store = globalThis.localStorage;
    if (!store || typeof store.getItem !== "function" || typeof store.setItem !== "function") return null;
    return store;
  } catch {
    return null;
  }
}

/**
 * The id in localStorage, creating it when this browser does not have one.
 * A missing or blocked store returns undefined and the request goes out without the header.
 */
export function deviceId(store?: Storage | null): string | undefined {
  const target = store === undefined ? storageOrNull() : store;
  if (!target) return undefined;
  try {
    const raw = target.getItem(DEVICE_ID_KEY);
    const existing = raw?.trim() ?? "";
    if (isDeviceId(existing)) {
      if (raw !== existing) target.setItem(DEVICE_ID_KEY, existing);
      return existing;
    }
    const created = globalThis.crypto.randomUUID();
    target.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return undefined;
  }
}

/** Adds `x-filedom-device` when this browser has an id. */
export function applyDeviceHeader(headers: Headers, store?: Storage | null): void {
  const id = deviceId(store);
  if (id) headers.set(DEVICE_HEADER, id);
}
