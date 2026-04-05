"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { roundLabel, calcFinalScores } from "@/lib/mahjong";

type GamePlayer = {
  id: string;
  name: string;
  seat: number;
};

type Score = {
  id: string;
  playerId: string;
  points: number;
};

type Round = {
  id: string;
  roundNum: number;
  honba: number;
  scores: Score[];
};

type Game = {
  id: string;
  status: string;
  initialPoints: number;
  returnPoints: number;
  players: GamePlayer[];
  rounds: Round[];
};

export default function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: gameId } = use(params);
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [scoreInputs, setScoreInputs] = useState<number[]>([0, 0, 0, 0]);
  const [roundNum, setRoundNum] = useState(0);
  const [honba, setHonba] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchGame = useCallback(async () => {
    const res = await fetch(`/api/games/${gameId}`);
    if (res.ok) {
      const data = await res.json();
      setGame(data);
      // 次の局番号を自動設定
      if (data.rounds.length > 0) {
        const lastRound = data.rounds[data.rounds.length - 1];
        setRoundNum(lastRound.roundNum + 1);
        setHonba(0);
      }
    }
  }, [gameId]);

  useEffect(() => {
    fetchGame();

    const socket = getSocket();
    socket.emit("join-game", gameId);
    socket.on("score-updated", fetchGame);
    socket.on("game-finished", () => {
      fetchGame();
    });

    return () => {
      socket.off("score-updated", fetchGame);
      socket.off("game-finished");
    };
  }, [gameId, fetchGame]);

  if (!game) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  // 各プレイヤーの現在の持ち点を計算
  const currentPoints = game.players.map((player) => {
    const total = game.rounds.reduce((sum, round) => {
      const score = round.scores.find((s) => s.playerId === player.id);
      return sum + (score?.points ?? 0);
    }, 0);
    return game.initialPoints + total;
  });

  const windLabels = ["東", "南", "西", "北"];

  // スコア入力の合計チェック
  const scoreTotal = scoreInputs.reduce((a, b) => a + b, 0);

  const handleSubmitScore = async () => {
    if (scoreTotal !== 0) return;
    setSubmitting(true);

    const scores = game.players.map((player, i) => ({
      playerId: player.id,
      points: scoreInputs[i],
    }));

    const res = await fetch(`/api/games/${gameId}/rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundNum, honba, scores }),
    });

    if (res.ok) {
      const socket = getSocket();
      socket.emit("score-updated", gameId);
      setScoreInputs([0, 0, 0, 0]);
      setShowScoreInput(false);
      await fetchGame();
    }
    setSubmitting(false);
  };

  const handleDeleteRound = async (roundId: string) => {
    const res = await fetch(
      `/api/games/${gameId}/rounds?roundId=${roundId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      const socket = getSocket();
      socket.emit("score-updated", gameId);
      await fetchGame();
    }
  };

  const handleFinishGame = async () => {
    const res = await fetch(`/api/games/${gameId}`, { method: "PATCH" });
    if (res.ok) {
      const socket = getSocket();
      socket.emit("game-finished", gameId);
      await fetchGame();
    }
  };

  const finalScores =
    game.status === "finished"
      ? calcFinalScores(
          currentPoints,
          game.initialPoints,
          game.returnPoints
        )
      : null;

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
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          game.status === "active"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        }`}>
          {game.status === "active" ? "対局中" : "終了"}
        </span>
      </div>

      {/* スコアボード */}
      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <div className="grid grid-cols-4 gap-2">
          {game.players.map((player, i) => (
            <div key={player.id} className="text-center">
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

      {/* アクションボタン */}
      {game.status === "active" && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setScoreInputs([0, 0, 0, 0]);
              setShowScoreInput(true);
            }}
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {roundLabel(roundNum)}
                {honba > 0 && ` ${honba}本場`}
              </h3>
              <button
                onClick={() => setShowScoreInput(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray-500">局</label>
                <select
                  value={roundNum}
                  onChange={(e) => setRoundNum(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  {Array.from({ length: 16 }, (_, i) => (
                    <option key={i} value={i}>
                      {roundLabel(i)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <label className="mb-1 block text-xs text-gray-500">本場</label>
                <input
                  type="number"
                  min={0}
                  value={honba}
                  onChange={(e) => setHonba(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              {game.players.map((player, i) => (
                <div key={player.id} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-medium truncate">
                    {player.name}
                  </span>
                  <input
                    type="number"
                    step={100}
                    value={scoreInputs[i] || ""}
                    onChange={(e) => {
                      const next = [...scoreInputs];
                      next[i] = Number(e.target.value) || 0;
                      setScoreInputs(next);
                    }}
                    placeholder="0"
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-right text-sm tabular-nums outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              ))}
            </div>

            <div className={`mt-3 text-center text-sm font-medium ${
              scoreTotal === 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}>
              合計: {scoreTotal > 0 ? "+" : ""}{scoreTotal.toLocaleString()}
              {scoreTotal !== 0 && " (0にしてください)"}
            </div>

            <button
              onClick={handleSubmitScore}
              disabled={scoreTotal !== 0 || submitting}
              className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "記録中..." : "記録する"}
            </button>
          </div>
        </div>
      )}

      {/* ラウンド履歴 */}
      {game.rounds.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <h3 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
            局履歴
          </h3>
          <div className="space-y-2">
            {[...game.rounds].reverse().map((round) => (
              <div
                key={round.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800"
              >
                <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300">
                  {roundLabel(round.roundNum)}
                  {round.honba > 0 && ` ${round.honba}本`}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    {game.players.map((player) => {
                      const score = round.scores.find(
                        (s) => s.playerId === player.id
                      );
                      const pts = score?.points ?? 0;
                      return (
                        <span
                          key={player.id}
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
                  {game.status === "active" && (
                    <button
                      onClick={() => handleDeleteRound(round.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
