import { createServer } from "http";
import { networkInterfaces } from "os";
import next from "next";
import { Server } from "socket.io";
import mdns from "multicast-dns";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);
const MDNS_HOSTNAME = "JanCal.local";

function getLocalIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

function startMdns(ip: string) {
  const m = mdns();

  m.on("query", (query) => {
    const match = query.questions.find(
      (q) =>
        q.name.toLowerCase() === MDNS_HOSTNAME.toLowerCase() && q.type === "A"
    );
    if (match) {
      m.respond({
        answers: [
          {
            name: MDNS_HOSTNAME,
            type: "A",
            ttl: 120,
            data: ip,
          },
        ],
      });
    }
  });

  return m;
}

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    // ゲームルームに参加
    socket.on("join-game", (gameId: string) => {
      socket.join(gameId);
    });

    // スコア更新を全端末に通知
    socket.on("score-updated", (gameId: string) => {
      socket.to(gameId).emit("score-updated");
    });

    // ゲーム終了を通知
    socket.on("game-finished", (gameId: string) => {
      socket.to(gameId).emit("game-finished");
    });
  });

  const localIP = getLocalIP();
  startMdns(localIP);

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${MDNS_HOSTNAME}:${port}`);
    console.log(`>          http://${localIP}:${port}`);
  });
});
