"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { roundLabel, calcFinalScores } from "@/lib/mahjong";
import ScoreInputModal from "@/components/ScoreInputModal";

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
  playerCount: number;
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

  const pc = game.playerCount;
  const windLabels = pc === 3 ? ["東", "南", "西"] : ["東", "南", "西", "北"];

  // 各プレイヤーの現在の持ち点を計算
  const currentPoints = game.players.map((player) => {
    const total = game.rounds.reduce((sum, round) => {
      const score = round.scores.find((s) => s.playerId === player.id);
      return sum + (score?.points ?? 0);
    }, 0);
    return game.initialPoints + total;
  });

  const handleSubmitScore = async (scores: number[]) => {
    setSubmitting(true);

    const scoreData = game.players.map((player, i) => ({
      playerId: player.id,
      points: scores[i],
    }));

    const res = await fetch(`/api/games/${gameId}/rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundNum, honba, scores: scoreData }),
    });

    if (res.ok) {
      const socket = getSocket();
      socket.emit("score-updated", gameId);
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
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {pc}人麻雀
          </span>
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
          players={game.players}
          playerCount={pc}
          roundNum={roundNum}
          honba={honba}
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
            {[...game.rounds].reverse().map((round) => (
              <div
                key={round.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800"
              >
                <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300">
                  {roundLabel(round.roundNum, pc)}
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
