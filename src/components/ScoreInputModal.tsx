"use client";

import { useState } from "react";
import {
  roundLabel,
  maxRounds,
  calcAgariPoints,
  calcDrawPayments,
  dealerSeat,
  SCORE_PRESETS,
  FU_OPTIONS,
  type WinType,
} from "@/lib/mahjong";

type GamePlayer = {
  id: string;
  name: string;
  seat: number;
};

type SubmitData = {
  scores: number[];
  kyotakuAfter: number;
  riichiSeats: number[];
  dealerContinues: boolean;
  resetHonba: boolean;
};

type Props = {
  players: GamePlayer[];
  playerCount: number;
  roundNum: number;
  honba: number;
  kyotaku: number;
  onRoundNumChange: (v: number) => void;
  onHonbaChange: (v: number) => void;
  onSubmit: (data: SubmitData) => void;
  onClose: () => void;
  submitting: boolean;
};

type InputMode = "agari" | "draw" | "manual";

export default function ScoreInputModal({
  players,
  playerCount,
  roundNum,
  honba,
  kyotaku,
  onRoundNumChange,
  onHonbaChange,
  onSubmit,
  onClose,
  submitting,
}: Props) {
  const [mode, setMode] = useState<InputMode>("agari");

  // アガリ入力用
  const [winnerSeat, setWinnerSeat] = useState<number | null>(null);
  const [winType, setWinType] = useState<WinType>("ron");
  const [loserSeat, setLoserSeat] = useState<number | null>(null);
  const [han, setHan] = useState<number>(1);
  const [fu, setFu] = useState<number>(30);
  const [presetIndex, setPresetIndex] = useState<number | null>(null);

  // リーチ（アガリ・流局共通）
  const [riichiSeats, setRiichiSeats] = useState<number[]>([]);

  // 流局用
  const [tenpaiSeats, setTenpaiSeats] = useState<number[]>([]);

  // 手動入力用
  const [manualInputs, setManualInputs] = useState<number[]>(
    new Array(playerCount).fill(0)
  );

  const dealer = dealerSeat(roundNum, playerCount);

  const toggleRiichi = (seat: number) => {
    setRiichiSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]
    );
  };

  // アガリの点数変動を計算
  const agariResult =
    winnerSeat !== null && (winType === "tsumo" || loserSeat !== null)
      ? calcAgariPoints(
          winnerSeat,
          winType,
          loserSeat,
          presetIndex !== null ? SCORE_PRESETS[presetIndex].han : han,
          presetIndex !== null ? SCORE_PRESETS[presetIndex].fu : fu,
          honba,
          playerCount,
          roundNum,
          riichiSeats,
          kyotaku,
        )
      : null;

  // 流局の点数変動
  const drawResult = calcDrawPayments(tenpaiSeats, playerCount, riichiSeats, kyotaku);

  // 現在の点数変動と供託
  const currentScores =
    mode === "agari"
      ? agariResult?.pointChanges ?? new Array(playerCount).fill(0)
      : mode === "draw"
      ? drawResult.pointChanges
      : manualInputs;

  const currentKyotakuAfter =
    mode === "agari"
      ? agariResult?.kyotakuAfter ?? kyotaku
      : mode === "draw"
      ? drawResult.kyotakuAfter
      : kyotaku;

  const scoreTotal = currentScores.reduce((a, b) => a + b, 0);
  const canSubmit =
    mode === "agari"
      ? agariResult !== null
      : mode === "draw"
      ? true
      : scoreTotal === 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const submittedRiichiSeats = mode === "manual" ? [] : riichiSeats;

    // 親の連荘判定
    // - アガリ: 親がアガった
    // - 流局: 親がテンパイ
    // - 手動: 連荘扱いしない（局を進める）
    let dealerContinues = false;
    let resetHonba = true;
    if (mode === "agari") {
      dealerContinues = winnerSeat === dealer;
      // 親アガリは本場+1（リセットしない）。子アガリは本場リセット。
      resetHonba = !dealerContinues;
    } else if (mode === "draw") {
      dealerContinues = tenpaiSeats.includes(dealer);
      // 流局は親テンパイ・ノーテンに関わらず本場+1
      resetHonba = false;
    }

    onSubmit({
      scores: currentScores,
      kyotakuAfter: currentKyotakuAfter,
      riichiSeats: submittedRiichiSeats,
      dealerContinues,
      resetHonba,
    });
  };

  // リーチ選択UI（アガリ・流局共通）
  const riichiSelector = (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-500">
        リーチ宣言者
        {kyotaku > 0 && (
          <span className="ml-2 text-amber-600 dark:text-amber-400">
            (供託 {kyotaku}本)
          </span>
        )}
      </label>
      <div className="flex gap-2">
        {players.map((p) => {
          const isRiichi = riichiSeats.includes(p.seat);
          return (
            <button
              key={p.id}
              onClick={() => toggleRiichi(p.seat)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                isRiichi
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {roundLabel(roundNum, playerCount)}
              {honba > 0 && ` ${honba}本場`}
            </h3>
            {kyotaku > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                供託 {kyotaku}本 ({(kyotaku * 1000).toLocaleString()}点)
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* 局・本場セレクタ */}
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">局</label>
            <select
              value={roundNum}
              onChange={(e) => onRoundNumChange(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {Array.from({ length: maxRounds(playerCount) }, (_, i) => (
                <option key={i} value={i}>
                  {roundLabel(i, playerCount)}
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
              onChange={(e) => onHonbaChange(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
        </div>

        {/* モード切り替え */}
        <div className="mb-4 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(
            [
              { key: "agari", label: "アガリ" },
              { key: "draw", label: "流局" },
              { key: "manual", label: "手動" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === key
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* === アガリモード === */}
        {mode === "agari" && (
          <div className="space-y-4">
            {/* アガリ者選択 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">
                アガリ
              </label>
              <div className="flex gap-2">
                {players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setWinnerSeat(p.seat);
                      if (loserSeat === p.seat) setLoserSeat(null);
                    }}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                      winnerSeat === p.seat
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className="block text-[10px] opacity-70">
                      {p.seat === dealer ? "親" : "子"}
                    </span>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* ツモ/ロン切り替え */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">
                アガリ方
              </label>
              <div className="flex gap-2">
                {(["tsumo", "ron"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setWinType(type);
                      if (type === "tsumo") setLoserSeat(null);
                    }}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                      winType === type
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {type === "tsumo" ? "ツモ" : "ロン"}
                  </button>
                ))}
              </div>
            </div>

            {/* 放銃者選択（ロン時のみ） */}
            {winType === "ron" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  放銃
                </label>
                <div className="flex gap-2">
                  {players
                    .filter((p) => p.seat !== winnerSeat)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setLoserSeat(p.seat)}
                        className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                          loserSeat === p.seat
                            ? "bg-red-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* リーチ宣言者 */}
            {riichiSelector}

            {/* 点数選択 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">
                点数
              </label>
              {/* 満貫以上プリセット */}
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SCORE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPresetIndex(idx)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      presetIndex === idx
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {/* 翻/符入力 */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-500">翻</label>
                  <select
                    value={presetIndex !== null ? "" : han}
                    onChange={(e) => {
                      setHan(Number(e.target.value));
                      setPresetIndex(null);
                    }}
                    className={`w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 ${
                      presetIndex !== null ? "opacity-50" : ""
                    }`}
                  >
                    {presetIndex !== null && <option value="">-</option>}
                    {Array.from({ length: 13 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>
                        {h}翻
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-500">符</label>
                  <select
                    value={presetIndex !== null ? "" : fu}
                    onChange={(e) => {
                      setFu(Number(e.target.value));
                      setPresetIndex(null);
                    }}
                    className={`w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 ${
                      presetIndex !== null ? "opacity-50" : ""
                    }`}
                  >
                    {presetIndex !== null && <option value="">-</option>}
                    {FU_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}符
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === 流局モード === */}
        {mode === "draw" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">
                テンパイ者を選択
              </label>
              <div className="flex gap-2">
                {players.map((p) => {
                  const isTenpai = tenpaiSeats.includes(p.seat);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setTenpaiSeats((prev) =>
                          isTenpai
                            ? prev.filter((s) => s !== p.seat)
                            : [...prev, p.seat]
                        );
                      }}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                        isTenpai
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* リーチ宣言者 */}
            {riichiSelector}
          </div>
        )}

        {/* === 手動入力モード === */}
        {mode === "manual" && (
          <div className="space-y-2">
            {players.map((player, i) => (
              <div key={player.id} className="flex items-center gap-3">
                <span className="w-16 text-sm font-medium truncate">
                  {player.name}
                </span>
                <input
                  type="number"
                  step={100}
                  value={manualInputs[i] || ""}
                  onChange={(e) => {
                    const next = [...manualInputs];
                    next[i] = Number(e.target.value) || 0;
                    setManualInputs(next);
                  }}
                  placeholder="0"
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-right text-sm tabular-nums outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            ))}
          </div>
        )}

        {/* 計算結果プレビュー */}
        <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <div className="mb-1 text-xs font-medium text-gray-500">
            点数変動
          </div>
          <div className="flex gap-2">
            {players.map((player, i) => {
              const isRiichi = mode !== "manual" && riichiSeats.includes(player.seat);
              const totalKyotaku = kyotaku + riichiSeats.length;
              const collectsKyotaku = mode === "agari" && agariResult !== null && player.seat === winnerSeat && totalKyotaku > 0;
              return (
                <div key={player.id} className="flex-1 text-center">
                  <div className="text-xs text-gray-500 truncate">
                    {player.name}
                  </div>
                  <div
                    className={`text-sm font-bold tabular-nums ${
                      currentScores[i] > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : currentScores[i] < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-400"
                    }`}
                  >
                    {currentScores[i] > 0 ? "+" : ""}
                    {currentScores[i].toLocaleString()}
                  </div>
                  {isRiichi && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400">
                      リーチ -1,000
                    </div>
                  )}
                  {collectsKyotaku && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400">
                      供託 +{(totalKyotaku * 1000).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {mode === "manual" && scoreTotal !== 0 && (
            <div className="mt-1 text-center text-xs font-medium text-red-600 dark:text-red-400">
              合計が0になりません ({scoreTotal > 0 ? "+" : ""}
              {scoreTotal.toLocaleString()})
            </div>
          )}
        </div>

        {/* 記録ボタン */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "記録中..." : "記録する"}
        </button>
      </div>
    </div>
  );
}
