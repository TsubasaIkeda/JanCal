"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type GameSummary = {
  id: string;
  createdAt: string;
  status: string;
  players: { name: string; seat: number }[];
};

export default function HistoryPage() {
  const router = useRouter();
  const [games, setGames] = useState<GameSummary[]>([]);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then(setGames);
  }, []);

  return (
    <div className="mx-auto w-full max-w-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">ゲーム一覧</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← 戻る
        </button>
      </div>

      {games.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-8">
          まだゲームがありません
        </p>
      ) : (
        <div className="space-y-2">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => router.push(`/game/${game.id}`)}
              className="w-full rounded-xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-2 text-sm">
                  {game.players.map((p) => (
                    <span key={p.seat} className="font-medium">
                      {p.name}
                    </span>
                  ))}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  game.status === "active"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}>
                  {game.status === "active" ? "対局中" : "終了"}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(game.createdAt).toLocaleString("ja-JP")}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
