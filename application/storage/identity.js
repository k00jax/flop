import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "flopPeerId";

export function getOrCreatePeerId(prefix = "flop-") {
  const normalizedPrefix = String(prefix || "flop-");
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing && typeof existing === "string" && existing.trim()) {
    const trimmed = existing.trim();

    if (trimmed.startsWith(normalizedPrefix)) {
      return trimmed;
    }

    if (/^[a-z0-9._-]{6,}$/i.test(trimmed)) {
      const migrated = `${normalizedPrefix}${trimmed}`;
      localStorage.setItem(STORAGE_KEY, migrated);
      return migrated;
    }
  }

  const peerId = `${normalizedPrefix}${uuidv4()}`;
  localStorage.setItem(STORAGE_KEY, peerId);
  return peerId;
}

export function clearPeerId() {
  localStorage.removeItem(STORAGE_KEY);
}
