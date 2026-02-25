import QRCode from "qrcode";

function extractPeerId(rawValue) {
  if (!rawValue) return "";
  const value = String(rawValue).trim();

  if (/^flop-/i.test(value)) {
    return value;
  }

  if (!/^https?:\/\//i.test(value)) {
    const compact = value.replace(/\s+/g, "");
    if (/^[a-z0-9._-]{6,}$/i.test(compact)) {
      return compact;
    }
  }

  try {
    const parsed = new URL(value, window.location.origin);
    const fromSearch =
      parsed.searchParams.get("peer") ||
      parsed.searchParams.get("id") ||
      "";

    if (fromSearch) return fromSearch;

    const hash = parsed.hash || "";
    const hashIndex = hash.indexOf("id=");
    if (hashIndex !== -1) {
      return hash.slice(hashIndex + 3).split("&")[0];
    }

    return "";
  } catch {
    return "";
  }
}

export async function createPairingQrDataUrl(peerId) {
  return QRCode.toDataURL(String(peerId || "").trim(), {
    margin: 1,
    width: 1000,
  });
}

export function parsePairingValue(rawValue) {
  return extractPeerId(rawValue);
}

export function openManualPeerPrompt() {
  const value = window.prompt("Enter peer ID or invite URL");
  return extractPeerId(value || "");
}
