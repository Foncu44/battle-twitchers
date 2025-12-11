import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer } from "ws";
import { registerWebSocketHandlers } from "./websocket";
import { configureTwitchOAuth } from "./twitch-auth";
import { createDatabase } from "./database";
import { fetchChannelPoints } from "./twitch-channel-points";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Simple JSON middleware and static serving (for eventual client build)
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "client-dist")));

// Initialize lightweight SQLite database
const db = createDatabase();

// Setup Twitch OAuth routes
configureTwitchOAuth(app);

// Simple helper to proxy channel points (expects access_token & broadcaster_id)
app.get("/twitch/channel-points", async (req, res) => {
  const accessToken = req.headers.authorization?.replace("Bearer ", "") ?? req.query.access_token;
  const broadcasterId = (req.query.broadcaster_id as string) || process.env.TWITCH_BROADCASTER_ID;
  if (!accessToken || !broadcasterId) return res.status(400).send("missing token or broadcaster_id");
  try {
    const data = await fetchChannelPoints(accessToken.toString(), broadcasterId);
    res.json(data);
  } catch (err) {
    console.error("[twitch] channel points fetch failed", err);
    res.status(500).send("channel points error");
  }
});

// Attach WebSocket handlers
registerWebSocketHandlers(wss, db);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

