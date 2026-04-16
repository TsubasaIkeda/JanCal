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
  onSyncRequest?: () => void;
};

export class RoomHost {
  private peer: Peer | null = null;
  private connections: DataConnection[] = [];
  private callbacks: PeerCallbacks;

  constructor(callbacks: PeerCallbacks) {
    this.callbacks = callbacks;
  }

  isOpen(): boolean {
    return !!this.peer && !this.peer.disconnected && !this.peer.destroyed;
  }

  // 一時的に切断されている場合にシグナリングサーバーへ再接続を試みる
  tryReconnect(): void {
    if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
      try {
        this.peer.reconnect();
      } catch {
        // noop
      }
    }
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
          // 新規接続時にホストの最新状態をブロードキャスト
          this.callbacks.onSyncRequest?.();
        });

        conn.on("data", (data) => {
          const msg = data as PeerMessage;
          if (msg.type === "action") {
            this.callbacks.onAction(msg.action);
          } else if (msg.type === "request-sync") {
            // ゲストが同期を要求 — ホストの最新状態をブロードキャスト
            this.callbacks.onSyncRequest?.();
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
  private roomId: string | null = null;
  private reconnecting = false;

  constructor(callbacks: PeerCallbacks) {
    this.callbacks = callbacks;
  }

  isOpen(): boolean {
    return !!this.connection && this.connection.open;
  }

  async join(roomId: string): Promise<void> {
    this.roomId = roomId;
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

  // バックグラウンド復帰時の再接続
  async tryReconnect(): Promise<void> {
    if (this.isOpen() || this.reconnecting || !this.roomId) return;
    this.reconnecting = true;
    try {
      // 既存のpeerは破棄して新しく作り直す
      this.peer?.destroy();
      this.peer = null;
      this.connection = null;
      await this.join(this.roomId);
    } catch {
      // 失敗時は次の機会に再試行
    } finally {
      this.reconnecting = false;
    }
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
    this.roomId = null;
  }
}
