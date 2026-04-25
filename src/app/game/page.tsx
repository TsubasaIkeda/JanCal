"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { roundLabel, calcFinalScores } from "@/lib/mahjong";
import {
  type GameState,
  createInitialState,
  addRound,
  deleteLastRound,
  finishGame,
  getCurrentPoints,
  saveState,
  loadState,
} from "@/lib/gameState";
import { RoomHost, RoomGuest, type GameAction, type PeerRole } from "@/lib/peer";
import { saveLastRoom } from "@/lib/prefs";
import ScoreInputModal from "@/components/ScoreInputModal";

function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = searchParams.get("room") ?? "";
  const role = (searchParams.get("role") ?? "guest") as PeerRole;

  const [game, setGame] = useState<GameState | null>(null);
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [roundNum, setRoundNum] = useState(0);
  const [honba, setHonba] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const hostRef = useRef<RoomHost | null>(null);
  const guestRef = useRef<RoomGuest | null>(null);
  const gameRef = useRef<GameState | null>(null);

  // gameRef を最新の状態に保つ
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // ホスト: ゲームステート更新時にブロードキャスト
  const updateAndBroadcast = useCallback((newState: GameState) => {
    setGame(newState);
    hostRef.current?.broadcast(newState);
  }, []);

  // ホスト: アクションを処理
  const handleAction = useCallback(
    (action: GameAction) => {
      setGame((prev) => {
        if (!prev) return prev;
        let next: GameState;
        switch (action.type) {
          case "add-round":
            next = addRound(
              prev,
              action.roundNum,
              action.honba,
              action.scores,
              action.kyotakuAfter,
              action.riichiSeats,
              action.dealerContinues,
              action.resetHonba,
            );
            break;
          case "delete-last-round":
            next = deleteLastRound(prev);
            break;
          case "finish-game":
            next = finishGame(prev);
            break;
          default:
            return prev;
        }
        // ブロードキャストは副作用なのでsetTimeout
        setTimeout(() => hostRef.current?.broadcast(next), 0);
        return next;
      });
    },
    [],
  );

  // 初期化
  useEffect(() => {
    if (!roomId) return;

    if (role === "host") {
      // ホスト: localStorage から復元、なければ新規作成
      const persisted = loadState(roomId);
      let initialState: GameState;
      if (persisted) {
        initialState = persisted;
      } else {
        const pc = Number(searchParams.get("pc") ?? "4");
        const ip = Number(searchParams.get("ip") ?? "25000");
        const rp = Number(searchParams.get("rp") ?? "30000");
        const names = (searchParams.get("p") ?? "").split(",");
        initialState = createInitialState(roomId, pc, names, ip, rp);
      }
      setGame(initialState);

      const host = new RoomHost({
        onStateUpdate: () => {},
        onAction: handleAction,
        onConnectionChange: setConnectionCount,
        onError: (msg) => setError(msg),
        onSyncRequest: () => {
          if (gameRef.current) {
            hostRef.current?.broadcast(gameRef.current);
          }
        },
      });

      hostRef.current = host;

      host.create(roomId).then(() => {
        // 初回同期のためにrequestSyncハンドラを更新
        host.broadcast(initialState);
      }).catch((err) => {
        setError(err.message);
      });

      return () => host.destroy();
    } else {
      // ゲスト: 先に localStorage から復元して即表示
      const persisted = loadState(roomId);
      if (persisted) setGame(persisted);

      const guest = new RoomGuest({
        onStateUpdate: setGame,
        onAction: () => {},
        onConnectionChange: () => {},
        onError: (msg) => setError(msg),
      });

      guestRef.current = guest;

      guest.join(roomId).catch((err) => {
        setError(err.message);
      });

      return () => guest.destroy();
    }
  }, [roomId, role, searchParams, handleAction]);

  // game state の変化を localStorage に保存
  useEffect(() => {
    if (!game) return;
    saveState(game);
  }, [game]);

  // 最後のルーム情報を保存（ホーム画面で再開できるように）
  useEffect(() => {
    if (!roomId) return;
    saveLastRoom(roomId, role);
  }, [roomId, role]);

  // タブ復帰時に接続が切れていれば再接続を試みる
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (role === "host") {
        hostRef.current?.tryReconnect();
      } else {
        guestRef.current?.tryReconnect().then(() => {
          // 再接続で状態が同期されればエラー表示をクリア
          setError("");
        });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [role]);

  // 局終了後の局番号・本場を計算
  // - 親アガリ・流局親テンパイ: 局そのまま、本場+1
  // - 子アガリ: 局+1、本場リセット
  // - 流局親ノーテン: 局+1、本場+1
  useEffect(() => {
    if (!game) return;
    if (game.rounds.length > 0) {
      const lastRound = game.rounds[game.rounds.length - 1];
      const continues = lastRound.dealerContinues ?? false;
      const reset = lastRound.resetHonba ?? true;
      setRoundNum(continues ? lastRound.roundNum : lastRound.roundNum + 1);
      setHonba(reset ? 0 : lastRound.honba + 1);
    }
  }, [game?.rounds.length]);

  const handleSubmitScore = (data: {
    scores: number[];
    kyotakuAfter: number;
    riichiSeats: number[];
    dealerContinues: boolean;
    resetHonba: boolean;
  }) => {
    setSubmitting(true);
    const action: GameAction = {
      type: "add-round",
      roundNum,
      honba,
      scores: data.scores,
      kyotakuAfter: data.kyotakuAfter,
      riichiSeats: data.riichiSeats,
      dealerContinues: data.dealerContinues,
      resetHonba: data.resetHonba,
    };

    if (role === "host") {
      handleAction(action);
    } else {
      guestRef.current?.sendAction(action);
    }

    setShowScoreInput(false);
    setSubmitting(false);
  };

  const handleDeleteRound = () => {
    const action: GameAction = { type: "delete-last-round" };
    if (role === "host") {
      handleAction(action);
    } else {
      guestRef.current?.sendAction(action);
    }
  };

  const handleFinishGame = () => {
    const action: GameAction = { type: "finish-game" };
    if (role === "host") {
      handleAction(action);
    } else {
      guestRef.current?.sendAction(action);
    }
  };

  const handleCopyInvite = async () => {
    const base = window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || "");
    const url = `${base}/game?room=${roomId}&role=guest`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    const handleReconnect = async () => {
      if (role === "host") {
        hostRef.current?.tryReconnect();
        setError("");
      } else {
        await guestRef.current?.tryReconnect();
        setError("");
      }
    };
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={handleReconnect}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              再接続
            </button>
            <button
              onClick={() => router.push("/")}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium dark:bg-gray-800"
            >
              トップに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">接続中...</p>
      </div>
    );
  }

  const pc = game.playerCount;
  const windLabels = pc === 3 ? ["東", "南", "西"] : ["東", "南", "西", "北"];
  const currentPoints = getCurrentPoints(game);

  const finalScores =
    game.status === "finished"
      ? calcFinalScores(currentPoints, game.initialPoints, game.returnPoints, pc)
      : null;

  const gridCols = pc === 3 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className="mx-auto w-full max-w-lg p-4 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← 戻る
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyInvite}
            className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-mono font-bold text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            title="招待リンクをコピー"
          >
            {copied ? "コピー済!" : `${roomId} 📋`}
          </button>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {pc}人麻雀
          </span>
          {role === "host" && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {connectionCount}人接続
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            game.status === "active"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}>
            {game.status === "active" ? "対局中" : "終了"}
          </span>
        </div>
      </div>

      {/* スコアボード */}
      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <div className={`grid ${gridCols} gap-2`}>
          {game.players.map((player, i) => (
            <div key={player.seat} className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {windLabels[player.seat]}
                </span>
                <span className="text-sm font-medium truncate">
                  {player.name}
                </span>
              </div>
              <div className={`mt-1 text-xl font-bold tabular-nums ${
                currentPoints[i] >= game.initialPoints
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-red-600 dark:text-red-400"
              }`}>
                {currentPoints[i].toLocaleString()}
              </div>
              {finalScores && (
                <div className={`mt-0.5 text-sm font-semibold ${
                  finalScores[i] >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {finalScores[i] > 0 ? "+" : ""}{finalScores[i].toFixed(1)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 供託表示 */}
      {game.kyotaku > 0 && (
        <div className="text-center text-sm font-medium text-amber-600 dark:text-amber-400">
          供託 {game.kyotaku}本 ({(game.kyotaku * 1000).toLocaleString()}点)
        </div>
      )}

      {/* アクションボタン */}
      {game.status === "active" && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowScoreInput(true)}
            className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            スコア入力
          </button>
          <button
            onClick={handleFinishGame}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            終了
          </button>
        </div>
      )}

      {/* スコア入力モーダル */}
      {showScoreInput && (
        <ScoreInputModal
          players={game.players.map((p) => ({ id: String(p.seat), ...p }))}
          playerCount={pc}
          roundNum={roundNum}
          honba={honba}
          kyotaku={game.kyotaku}
          onRoundNumChange={setRoundNum}
          onHonbaChange={setHonba}
          onSubmit={handleSubmitScore}
          onClose={() => setShowScoreInput(false)}
          submitting={submitting}
        />
      )}

      {/* ラウンド履歴 */}
      {game.rounds.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <h3 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
            局履歴
          </h3>
          <div className="space-y-2">
            {[...game.rounds].reverse().map((round, reverseIdx) => {
              const isLast = reverseIdx === 0;
              return (
                <div
                  key={`${round.roundNum}-${round.honba}`}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800"
                >
                  <div className="shrink-0">
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {roundLabel(round.roundNum, pc)}
                      {round.honba > 0 && ` ${round.honba}本`}
                    </span>
                    {round.riichiSeats && round.riichiSeats.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {round.riichiSeats.map((seat) => {
                          const player = game.players.find((p) => p.seat === seat);
                          return (
                            <span
                              key={seat}
                              className="rounded-sm bg-amber-100 px-1 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            >
                              {player?.name ?? `P${seat}`} R
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      {game.players.map((player) => {
                        const score = round.scores.find(
                          (s) => s.seat === player.seat
                        );
                        const pts = score?.points ?? 0;
                        return (
                          <span
                            key={player.seat}
                            className={`w-16 text-right tabular-nums ${
                              pts > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : pts < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-400"
                            }`}
                          >
                            {pts > 0 ? "+" : ""}{pts.toLocaleString()}
                          </span>
                        );
                      })}
                    </div>
                    {game.status === "active" && isLast && (
                      <button
                        onClick={handleDeleteRound}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-500">読み込み中...</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
