const PREFIX = "flopMessages_";

function keyFor(peerId) {
  return `${PREFIX}${peerId}`;
}

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function getMessages(peerId, limit = 200) {
  if (!peerId) return [];
  const messages = safeParse(localStorage.getItem(keyFor(peerId)), []);
  if (!Number.isFinite(limit) || limit <= 0) return messages;
  return messages.slice(-limit);
}

export function appendMessage(peerId, message) {
  if (!peerId || !message) return [];
  const messages = safeParse(localStorage.getItem(keyFor(peerId)), []);

  messages.push({
    ts: message.ts || Date.now(),
    dir: message.dir || "in",
    type: message.type || "text",
    payload: message.payload || {},
    id: message.id || "",
    from: message.from || "",
    to: message.to || "",
  });

  localStorage.setItem(keyFor(peerId), JSON.stringify(messages));
  return messages;
}
