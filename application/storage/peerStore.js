const PEERS_KEY = "flopPeers";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function getPeers() {
  return safeParse(localStorage.getItem(PEERS_KEY), []);
}

export function savePeers(peers) {
  localStorage.setItem(PEERS_KEY, JSON.stringify(peers));
}

export function upsertPeer(peerId, updates = {}) {
  if (!peerId) return [];

  const peers = getPeers();
  const index = peers.findIndex((peer) => peer.peerId === peerId);
  const now = Date.now();

  if (index === -1) {
    peers.push({
      peerId,
      nickname: updates.nickname || "",
      lastSeen: updates.lastSeen || now,
    });
  } else {
    peers[index] = {
      ...peers[index],
      ...updates,
      peerId,
      lastSeen: updates.lastSeen || now,
    };
  }

  peers.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  savePeers(peers);
  return peers;
}

export function removePeer(peerId) {
  const peers = getPeers().filter((peer) => peer.peerId !== peerId);
  savePeers(peers);
  return peers;
}

export function renamePeer(peerId, nickname) {
  const peers = getPeers();
  const index = peers.findIndex((peer) => peer.peerId === peerId);
  if (index === -1) return peers;

  peers[index] = {
    ...peers[index],
    nickname: String(nickname || "").trim(),
    lastSeen: Date.now(),
  };

  savePeers(peers);
  return peers;
}

export function getMostRecentPeer() {
  const peers = getPeers();
  if (!peers.length) return null;

  peers.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  return peers[0] || null;
}
