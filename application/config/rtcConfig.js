export function getRtcConfig() {
  const peer = {
    host: process.env.PEER_HOST || "0.peerjs.com",
    port: Number(process.env.PEER_PORT || 443),
    path: process.env.PEER_PATH || "/",
    secure: (process.env.PEER_SECURE || "true") === "true",
  };

  const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

  if (process.env.TURN_URL && process.env.TURN_USER && process.env.TURN_PASS) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USER,
      credential: process.env.TURN_PASS,
    });
  }

  return { peer, iceServers };
}
