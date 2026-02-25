import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "flopPeerId";

export function getOrCreatePeerId(prefix = "flop-") {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing && typeof existing === "string" && existing.trim()) {
    return existing.trim();
  }

  const peerId = `${prefix}${uuidv4()}`;
  localStorage.setItem(STORAGE_KEY, peerId);
  return peerId;
}

export function clearPeerId() {
  localStorage.removeItem(STORAGE_KEY);
}
