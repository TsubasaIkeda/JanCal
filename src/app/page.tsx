"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateRoomId } from "@/lib/gameState";

type Tab = "create" | "join";

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("create");

  // ルーム作成用
  const [playerCount, setPlayerCount] = useState<3 | 4>(4);
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const [initialPoints, setInitialPoints] = useState(25000);
  const [returnPoints, setReturnPoints] = useState(30000);

  // ルーム参加用
  const [joinRoomId, setJoinRoomId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const windLabels = playerCount === 3 ? ["東", "南", "西"] : ["東", "南", "西", "北"];
  const activeNames = playerNames.slice(0, playerCount);

  const handlePlayerCountChange = (count: 3 | 4) => {
    setPlayerCount(count);
    if (count === 3) {
      setInitialPoints(35000);
      setReturnPoints(40000);
    } else {
      setInitialPoints(25000);
      setReturnPoints(30000);
    }
  };

  const handleCreate = () => {
    if (activeNames.some((n) => n.trim() === "")) return;
    setLoading(true);
    const roomId = generateRoomId();

    const params = new URLSearchParams({
      room: roomId,
      role: "host",
      pc: String(playerCount),
      ip: String(initialPoints),
      rp: String(returnPoints),
      p: activeNames.map((n) => n.trim()).join(","),
    });

    router.push(`/game?${params.toString()}`);
  };

  const handleJoin = () => {
    const id = joinRoomId.trim().toUpperCase();
    if (id.length === 0) {
      setError("ルームIDを入力してください");
      return;
    }
    setLoading(true);
    router.push(`/game?room=${id}&role=guest`);
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
          {/* タブ切り替え */}
          <div className="mb-5 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {(
              [
                { key: "create", label: "ルーム作成" },
                { key: "join", label: "ルーム参加" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setError(""); }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  tab === key
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* === ルーム作成 === */}
          {tab === "create" && (
            <>
              {/* 人数切り替え */}
              <div className="mb-4 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                {([3, 4] as const).map((count) => (
                  <button
                    key={count}
                    onClick={() => handlePlayerCountChange(count)}
                    className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                      playerCount === count
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {count}人麻雀
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {activeNames.map((name, i) => (
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
                disabled={loading || activeNames.some((n) => n.trim() === "")}
                className="mt-5 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "作成中..." : "ルーム作成"}
              </button>
            </>
          )}

          {/* === ルーム参加 === */}
          {tab === "join" && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    ルームID
                  </label>
                  <input
                    type="text"
                    placeholder="例: ABC123"
                    value={joinRoomId}
                    onChange={(e) => {
                      setJoinRoomId(e.target.value.toUpperCase());
                      setError("");
                    }}
                    maxLength={6}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
                {error && (
                  <p className="text-center text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleJoin}
                disabled={loading || joinRoomId.trim().length === 0}
                className="mt-5 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "接続中..." : "ルームに参加"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
