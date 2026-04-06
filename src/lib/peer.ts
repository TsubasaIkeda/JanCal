"use client";

import Peer, { DataConnection } from "peerjs";
import { type GameState } from "./gameState";

const PEER_PREFIX = "jancal-";

export type PeerRole = "host" | "guest";

export type PeerMessage =
  | { type: "sync"; state: GameState }
  | { type: "action"; action: GameAction }
  | { type: "request-sync" };

export type GameAction =
  | {
      type: "add-round";
      roundNum: number;
      honba: number;
      scores: number[];
      kyotakuAfter: number;
      riichiSeats: number[];
    }
  | { type: "delete-last-round" }
  | { type: "finish-game" };

export type PeerCallbacks = {
  onStateUpdate: (state: GameState) => void;
  onAction: (action: GameAction) => void;
  onConnectionChange: (count: number) => void;
  onError: (error: string) => void;
};

export class RoomHost {
  private peer: Peer | null = null;
  private connections: DataConnection[] = [];
  private callbacks: PeerCallbacks;

  constructor(callbacks: PeerCallbacks) {
    this.callbacks = callbacks;
  }

  async create(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer(PEER_PREFIX + roomId);

      this.peer.on("open", () => {
        resolve();
      });

      this.peer.on("connection", (conn) => {
        conn.on("open", () => {
          this.connections.push(conn);
          this.callbacks.onConnectionChange(this.connections.length);
        });

        conn.on("data", (data) => {
          const msg = data as PeerMessage;
          if (msg.type === "action") {
            this.callbacks.onAction(msg.action);
          } else if (msg.type === "request-sync") {
            // ゲストが同期を要求
            this.callbacks.onAction({ type: "delete-last-round" }); // no-op trigger, handled by sync
          }
        });

        conn.on("close", () => {
          this.connections = this.connections.filter((c) => c !== conn);
          this.callbacks.onConnectionChange(this.connections.length);
        });
      });

      this.peer.on("error", (err) => {
        if (err.type === "unavailable-id") {
          reject(new Error("このルームIDは既に使われています"));
        } else {
          this.callbacks.onError(err.message);
        }
      });
    });
  }

  broadcast(state: GameState): void {
    const msg: PeerMessage = { type: "sync", state };
    for (const conn of this.connections) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }

  destroy(): void {
    this.peer?.destroy();
    this.peer = null;
    this.connections = [];
  }
}

export class RoomGuest {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private callbacks: PeerCallbacks;

  constructor(callbacks: PeerCallbacks) {
    this.callbacks = callbacks;
  }

  async join(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer();

      this.peer.on("open", () => {
        const conn = this.peer!.connect(PEER_PREFIX + roomId, {
          reliable: true,
        });

        conn.on("open", () => {
          this.connection = conn;
          // 初回同期を要求
          conn.send({ type: "request-sync" } satisfies PeerMessage);
          resolve();
        });

        conn.on("data", (data) => {
          const msg = data as PeerMessage;
          if (msg.type === "sync") {
            this.callbacks.onStateUpdate(msg.state);
          }
        });

        conn.on("close", () => {
          this.connection = null;
          this.callbacks.onError("ホストとの接続が切れました");
        });

        conn.on("error", (err) => {
          reject(new Error("接続に失敗しました: " + err.message));
        });
      });

      this.peer.on("error", (err) => {
        if (err.type === "peer-unavailable") {
          reject(new Error("ルームが見つかりません"));
        } else {
          reject(new Error(err.message));
        }
      });
    });
  }

  sendAction(action: GameAction): void {
    if (this.connection?.open) {
      this.connection.send({
        type: "action",
        action,
      } satisfies PeerMessage);
    }
  }

  destroy(): void {
    this.peer?.destroy();
    this.peer = null;
    this.connection = null;
  }
}
