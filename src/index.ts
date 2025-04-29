import * as http from "http";
import * as url from "url";
import dotenv from "dotenv";

dotenv.config();
const PORT = process.env.PORT || 3000;
const COOLDOWN_MS = 30000; // 30 seconds cooldown

interface PlayerData {
  playerName: string;
  currentDay: number;
  modpackName: string;
  version: string;
  lastActive: number; // Changed from timeout to track timestamp
}

const activePlayers = new Map<string, PlayerData>();

// Cleanup old entries every 5 seconds
setInterval(() => {
  const now = Date.now();
  for (const [playerName, data] of activePlayers.entries()) {
    if (now - data.lastActive > COOLDOWN_MS) {
      activePlayers.delete(playerName);
      console.log(`Removed ${playerName} due to inactivity`);
    }
  }
}, 5000);

const server = http.createServer((req, res) => {
  const reqUrl = url.parse(req.url || "", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "POST" && reqUrl.pathname === "/ping") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (!data.playerName || !data.modpackName || !data.version) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: "Missing required fields" }));
        }

        const playerData: PlayerData = {
          playerName: data.playerName,
          currentDay: data.currentDay,
          modpackName: data.modpackName,
          version: data.version,
          lastActive: Date.now(), // Track timestamp instead of countdown
        };

        activePlayers.set(data.playerName, playerData);
        console.log(
          `Updated ${data.playerName} | ${activePlayers.size} players total`
        );

        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  } else if (req.method === "GET" && reqUrl.pathname === "/players") {
    const players = Array.from(activePlayers.values()).map((p) => ({
      playerName: p.playerName,
      currentDay: p.currentDay,
      modpackName: p.modpackName,
    }));

    res.writeHead(200);
    res.end(
      JSON.stringify({
        count: players.length,
        players,
      })
    );
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not Found", status: 404 }));
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Endpoints:
  POST /ping - Send player heartbeat
  GET /players - Get active players list`);
});
