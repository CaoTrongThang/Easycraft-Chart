"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const url = __importStar(require("url"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
const COOLDOWN_MS = 30000; // 30 seconds cooldown
const activePlayers = new Map();
// Cleanup old entries every 5 seconds
setInterval(() => {
    const now = Date.now();
    for (const [playerName, data] of activePlayers.entries()) {
        if (now - data.lastPing > COOLDOWN_MS) {
            activePlayers.delete(playerName);
            console.log(`Removed ${playerName} from active players | ${activePlayers.size} left`);
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
                const playerData = {
                    playerName: data.playerName,
                    modpackName: data.modpackName,
                    lastPing: Date.now(),
                };
                activePlayers.set(data.playerName, playerData);
                console.log(`Updated ${data.playerName} | ${activePlayers.size} players total`);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
            }
            catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
    }
    else if (req.method === "GET" && reqUrl.pathname === "/players") {
        const now = Date.now();
        const players = Array.from(activePlayers.values())
            .filter((p) => now - p.lastPing <= COOLDOWN_MS)
            .map((p) => ({
            playerName: p.playerName,
            modpackName: p.modpackName,
            lastSeen: p.lastPing,
        }));
        res.writeHead(200);
        res.end(JSON.stringify({
            count: players.length,
            players,
        }));
    }
    else {
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
