import * as http from "http";
import * as url from "url";
import dotenv from "dotenv";

dotenv.config();
const PORT = process.env.PORT || 3000;
const COOLDOWN_MS = 30000; // 30 seconds cooldown

interface PlayerData {
  playerName: string;
  modpackName: string;
  version: string;
  lastPing: number;
}

const activePlayers = new Map<string, PlayerData>();

// Cleanup old entries every 5 seconds
setInterval(() => {
  const now = Date.now();
  for (const [playerName, data] of activePlayers.entries()) {
    if (now - data.lastPing > COOLDOWN_MS) {
      activePlayers.delete(playerName);
      console.log(
        `Removed ${playerName} from active players | ${activePlayers.size} left`
      );
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
        if (!data.playerName || !data.modpackName) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: "Missing required fields" }));
        }

        const playerData: PlayerData = {
          playerName: data.playerName,
          modpackName: data.modpackName,
          version: data.version,
          lastPing: Date.now(),
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
    const now = Date.now();
    const players = Array.from(activePlayers.values())
      .filter((p) => now - p.lastPing <= COOLDOWN_MS)
      .map((p) => ({
        playerName: p.playerName,
        modpackName: p.modpackName,
        lastSeen: new Date(p.lastPing).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        }),
        // Alternative simple format:
        // lastSeen: new Date(p.lastPing).toISOString().replace('T', ' ').slice(0, 19)
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
