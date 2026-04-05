import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

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

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
