require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
  ChannelType,
  Client,
  GatewayIntentBits,
} = require("discord.js");
const { Peer } = require("peerjs");

const MAP_FILE = path.join(__dirname, "peerMap.json");

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_OWNER_USER_ID = process.env.DISCORD_OWNER_USER_ID;
const DISCORD_CATEGORY_NAME = process.env.DISCORD_CATEGORY_NAME || "Text messages";

const PEER_HOST = process.env.PEER_HOST || "0.peerjs.com";
const PEER_PORT = Number(process.env.PEER_PORT || 443);
const PEER_PATH = process.env.PEER_PATH || "/";
const PEER_SECURE = (process.env.PEER_SECURE || "true") === "true";

const TURN_URL = process.env.TURN_URL;
const TURN_USER = process.env.TURN_USER;
const TURN_PASS = process.env.TURN_PASS;

const BRIDGE_PEER_ID =
  process.env.FLOP_BRIDGE_PEER_ID || `flop-bridge-${Math.random().toString(36).slice(2, 10)}`;

if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !DISCORD_OWNER_USER_ID) {
  console.error(
    "Missing required env. Needed: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_OWNER_USER_ID.",
  );
  process.exit(1);
}

function loadMap() {
  try {
    if (!fs.existsSync(MAP_FILE)) return {};
    const raw = fs.readFileSync(MAP_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function saveMap(mapData) {
  fs.writeFileSync(MAP_FILE, JSON.stringify(mapData, null, 2));
}

const peerMap = loadMap();
const peerConnections = new Map();

function shortPeerId(peerId) {
  if (!peerId) return "";
  return String(peerId).replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 8).toLowerCase();
}

function channelNameForPeer(peerId) {
  const shortId = shortPeerId(peerId) || "unknown";
  return `flop-${shortId}`;
}

async function getCategoryChannel(guild) {
  let category = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === DISCORD_CATEGORY_NAME,
  );

  if (!category) {
    category = await guild.channels.create({
      name: DISCORD_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
      reason: "Flop bridge category",
    });
  }

  return category;
}

async function getOrCreatePeerChannel(guild, peerId) {
  const mapped = peerMap[peerId];
  if (mapped) {
    const existing = guild.channels.cache.get(mapped);
    if (existing) return existing;
  }

  const category = await getCategoryChannel(guild);
  const name = channelNameForPeer(peerId);

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `Flop peerId: ${peerId}`,
    reason: `Flop bridge channel for ${peerId}`,
  });

  peerMap[peerId] = channel.id;
  saveMap(peerMap);
  return channel;
}

function buildPeerConfig() {
  const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
  if (TURN_URL && TURN_USER && TURN_PASS) {
    iceServers.push({
      urls: TURN_URL,
      username: TURN_USER,
      credential: TURN_PASS,
    });
  }

  return {
    host: PEER_HOST,
    port: PEER_PORT,
    path: PEER_PATH,
    secure: PEER_SECURE,
    config: { iceServers },
  };
}

const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const peer = new Peer(BRIDGE_PEER_ID, buildPeerConfig());

async function postIncomingToDiscord(peerId, data) {
  const guild = await discordClient.guilds.fetch(DISCORD_GUILD_ID);
  await guild.channels.fetch();

  const channel = await getOrCreatePeerChannel(guild, peerId);
  const text = data?.payload?.text || "[non-text message]";
  const shortId = shortPeerId(peerId);
  const prefix = shortId ? `[IN ${shortId}]` : "[IN]";

  await channel.send(`${prefix} ${text}`);
}

function getPeerIdByChannelId(channelId) {
  return Object.keys(peerMap).find((peerId) => peerMap[peerId] === channelId) || null;
}

function sendToPeer(peerId, text) {
  let conn = peerConnections.get(peerId);

  if (!conn || !conn.open) {
    conn = peer.connect(peerId, {
      label: "flop",
      reliable: true,
      metadata: JSON.stringify({
        unique_id: "discord-bridge",
        signaling_server_url: PEER_HOST,
      }),
    });
    peerConnections.set(peerId, conn);
  }

  const payload = {
    nickname: "Discord",
    type: "text",
    payload: { text },
    id: `discord-${Date.now()}`,
    datetime: new Date(),
    to: peerId,
    from: BRIDGE_PEER_ID,
  };

  const sendNow = () => {
    try {
      conn.send(payload);
    } catch (err) {
      console.error("Failed to send to peer:", err.message || err);
    }
  };

  if (conn.open) {
    sendNow();
  } else {
    conn.once("open", sendNow);
  }
}

peer.on("open", (id) => {
  console.log(`Flop bridge peer online: ${id}`);
});

peer.on("connection", (conn) => {
  const remotePeerId = conn.peer;
  peerConnections.set(remotePeerId, conn);

  conn.on("open", () => {
    console.log(`Peer connected: ${remotePeerId}`);
  });

  conn.on("data", async (data) => {
    if (conn.label !== "flop") return;

    try {
      await postIncomingToDiscord(remotePeerId, data);
    } catch (err) {
      console.error("Failed posting message to Discord:", err.message || err);
    }
  });

  conn.on("close", () => {
    peerConnections.delete(remotePeerId);
  });

  conn.on("error", (err) => {
    console.error("Peer connection error:", err.message || err);
  });
});

peer.on("error", (err) => {
  console.error("Peer error:", err.message || err);
});

discordClient.on("ready", async () => {
  console.log(`Discord bot ready as ${discordClient.user.tag}`);

  const guild = await discordClient.guilds.fetch(DISCORD_GUILD_ID);
  await guild.channels.fetch();
  await getCategoryChannel(guild);

  console.log(`Bridge running. Category: ${DISCORD_CATEGORY_NAME}`);
  console.log(`Bridge peerId: ${BRIDGE_PEER_ID}`);
});

discordClient.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.guildId !== DISCORD_GUILD_ID) return;

  if (message.author.id !== DISCORD_OWNER_USER_ID) {
    return;
  }

  const peerId = getPeerIdByChannelId(message.channelId);
  if (!peerId) return;

  const content = String(message.content || "").trim();
  if (!content) return;

  sendToPeer(peerId, content);
  const shortId = shortPeerId(peerId);
  const prefix = shortId ? `[OUT ${shortId}]` : "[OUT]";
  await message.channel.send(`${prefix} ${content}`);
});

discordClient.login(DISCORD_BOT_TOKEN);
