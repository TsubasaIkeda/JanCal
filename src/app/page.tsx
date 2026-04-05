"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const [initialPoints, setInitialPoints] = useState(25000);
  const [returnPoints, setReturnPoints] = useState(30000);
  const [loading, setLoading] = useState(false);

  const windLabels = ["東", "南", "西", "北"];

  const handleCreate = async () => {
    if (playerNames.some((name) => name.trim() === "")) return;
    setLoading(true);

    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerNames, initialPoints, returnPoints }),
    });

    if (res.ok) {
      const game = await res.json();
      router.push(`/game/${game.id}`);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">JanCal</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            麻雀点数計算
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">新しいゲームを作成</h2>

          <div className="space-y-3">
            {playerNames.map((name, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  {windLabels[i]}
                </span>
                <input
                  type="text"
                  placeholder={`プレイヤー${i + 1}の名前`}
                  value={name}
                  onChange={(e) => {
                    const next = [...playerNames];
                    next[i] = e.target.value;
                    setPlayerNames(next);
                  }}
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                持ち点
              </label>
              <input
                type="number"
                value={initialPoints}
                onChange={(e) => setInitialPoints(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                返し点
              </label>
              <input
                type="number"
                value={returnPoints}
                onChange={(e) => setReturnPoints(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || playerNames.some((n) => n.trim() === "")}
            className="mt-5 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "作成中..." : "ゲーム開始"}
          </button>
        </div>

        <HistoryLink />
      </div>
    </div>
  );
}

function HistoryLink() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/history")}
      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      過去のゲーム一覧
    </button>
  );
}
