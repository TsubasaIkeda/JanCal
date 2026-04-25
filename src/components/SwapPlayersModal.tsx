"use client";

import { useState } from "react";
import { type Player } from "@/lib/gameState";

type Props = {
  players: Player[];
  windLabels: string[];
  onSwap: (seatA: number, seatB: number) => void;
  onClose: () => void;
};

export default function SwapPlayersModal({
  players,
  windLabels,
  onSwap,
  onClose,
}: Props) {
  const [seatA, setSeatA] = useState<number | null>(null);
  const [seatB, setSeatB] = useState<number | null>(null);

  const canSwap = seatA !== null && seatB !== null && seatA !== seatB;

  const handleSelect = (seat: number) => {
    if (seatA === seat) {
      setSeatA(null);
      return;
    }
    if (seatB === seat) {
      setSeatB(null);
      return;
    }
    if (seatA === null) {
      setSeatA(seat);
    } else if (seatB === null) {
      setSeatB(seat);
    }
  };

  const handleSubmit = () => {
    if (canSwap) onSwap(seatA!, seatB!);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">プレイヤー入れ替え</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          入れ替える2人を選択してください。点数履歴は席に紐づいたまま残ります。
        </p>
        <div className="space-y-2">
          {players.map((p) => {
            const isA = seatA === p.seat;
            const isB = seatB === p.seat;
            const selected = isA || isB;
            const order = isA ? 1 : isB ? 2 : null;
            return (
              <button
                key={p.seat}
                onClick={() => handleSelect(p.seat)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  selected
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    selected
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                  }`}
                >
                  {windLabels[p.seat]}
                </span>
                <span className="flex-1 truncate">{p.name}</span>
                {order && (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                    {order}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canSwap}
          className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          入れ替える
        </button>
      </div>
    </div>
  );
}
