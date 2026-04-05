// 局番号から表示名に変換
// 4人麻雀: 0=東1局, 1=東2局, ..., 4=南1局, ...
// 3人麻雀: 0=東1局, 1=東2局, 2=東3局, 3=南1局, ...
export function roundLabel(roundNum: number, playerCount: number = 4): string {
  const winds = ["東", "南", "西", "北"];
  const roundsPerWind = playerCount;
  const windIndex = Math.floor(roundNum / roundsPerWind);
  const num = (roundNum % roundsPerWind) + 1;
  return `${winds[windIndex] ?? "?"}${num}局`;
}

// 3人麻雀の局数リスト（東1〜東3、南1〜南3 = 6局）
// 4人麻雀の局数リスト（東1〜東4、南1〜南4、西1〜西4、北1〜北4 = 16局）
export function maxRounds(playerCount: number): number {
  return playerCount === 3 ? 12 : 16;
}

// 現在の局番号から親の席番号を取得
export function dealerSeat(roundNum: number, playerCount: number): number {
  return roundNum % playerCount;
}

// --- 点数計算 ---

function ceil100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

// 翻・符から基本点を計算
function calcBasePoints(han: number, fu: number): number {
  if (han >= 13) return 8000; // 役満
  if (han >= 11) return 6000; // 三倍満
  if (han >= 8) return 4000;  // 倍満
  if (han >= 6) return 3000;  // 跳満
  // 満貫判定
  if (han >= 5) return 2000;
  const base = fu * Math.pow(2, han + 2);
  if (base >= 2000) return 2000; // 満貫
  return base;
}

export type WinType = "tsumo" | "ron";

export type AgariResult = {
  /** 各プレイヤーの点数変動（席番号順） */
  pointChanges: number[];
};

/**
 * アガリ時の点数変動を計算する
 * @param winnerSeat アガった人の席番号
 * @param winType ツモ or ロン
 * @param loserSeat ロンの場合の放銃者の席番号
 * @param han 翻数
 * @param fu 符
 * @param honba 本場数
 * @param playerCount プレイヤー数
 * @param roundNum 局番号（親の判定に使用）
 */
export function calcAgariPoints(
  winnerSeat: number,
  winType: WinType,
  loserSeat: number | null,
  han: number,
  fu: number,
  honba: number,
  playerCount: number,
  roundNum: number,
): AgariResult {
  const base = calcBasePoints(han, fu);
  const isDealer = winnerSeat === dealerSeat(roundNum, playerCount);
  const honbaBonus = honba * 300;

  const pointChanges = new Array(playerCount).fill(0);

  if (winType === "ron") {
    const seat = loserSeat!;
    const payment = isDealer ? ceil100(base * 6) : ceil100(base * 4);
    pointChanges[winnerSeat] = payment + honbaBonus;
    pointChanges[seat] = -(payment + honbaBonus);
  } else {
    // ツモ
    if (isDealer) {
      // 親ツモ: 各子が base×2 を支払い
      const eachPay = ceil100(base * 2);
      const honbaEach = Math.floor(honbaBonus / (playerCount - 1));
      for (let i = 0; i < playerCount; i++) {
        if (i === winnerSeat) continue;
        pointChanges[i] = -(eachPay + honbaEach);
      }
      pointChanges[winnerSeat] = -pointChanges.reduce((a, b) => a + b, 0);
    } else {
      // 子ツモ: 親が base×2、他の子が base×1 を支払い
      const dealer = dealerSeat(roundNum, playerCount);
      const honbaEach = Math.floor(honbaBonus / (playerCount - 1));
      for (let i = 0; i < playerCount; i++) {
        if (i === winnerSeat) continue;
        const pay = i === dealer ? ceil100(base * 2) : ceil100(base * 1);
        pointChanges[i] = -(pay + honbaEach);
      }
      pointChanges[winnerSeat] = -pointChanges.reduce((a, b) => a + b, 0);
    }
  }

  return { pointChanges };
}

// 満貫以上のプリセット
export type ScorePreset = {
  label: string;
  han: number;
  fu: number;
};

export const SCORE_PRESETS: ScorePreset[] = [
  { label: "満貫", han: 5, fu: 30 },
  { label: "跳満", han: 6, fu: 30 },
  { label: "倍満", han: 8, fu: 30 },
  { label: "三倍満", han: 11, fu: 30 },
  { label: "役満", han: 13, fu: 30 },
];

// 符の選択肢
export const FU_OPTIONS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];

// 流局時のテンパイ料計算
export function calcDrawPayments(
  tenpaiSeats: number[],
  playerCount: number,
): number[] {
  const totalPool = playerCount === 3 ? 2000 : 3000;
  const tenpaiCount = tenpaiSeats.length;
  const notenpaiCount = playerCount - tenpaiCount;

  const pointChanges = new Array(playerCount).fill(0);

  if (tenpaiCount === 0 || tenpaiCount === playerCount) return pointChanges;

  const eachReceive = Math.floor(totalPool / tenpaiCount);
  const eachPay = Math.floor(totalPool / notenpaiCount);

  for (let i = 0; i < playerCount; i++) {
    pointChanges[i] = tenpaiSeats.includes(i) ? eachReceive : -eachPay;
  }

  return pointChanges;
}

// ウマ・オカを含む最終スコア計算
export function calcFinalScores(
  currentPoints: number[],
  initialPoints: number,
  returnPoints: number,
  playerCount: number = 4
): number[] {
  // オカ = (返し - 持ち) × 人数 をトップに加算
  const oka = (returnPoints - initialPoints) * playerCount;

  // 素点（返し点を基準にした差分、千点単位）
  const rawScores = currentPoints.map(
    (p) => Math.round((p - returnPoints) / 1000) * 10
  );

  // 順位でソート（同点は席順優先）
  const indexed = currentPoints.map((p, i) => ({ points: p, index: i }));
  indexed.sort((a, b) => b.points - a.points);

  // ウマ
  const uma = playerCount === 3 ? [20, 0, -20] : [20, 10, -10, -20];
  const finalScores = new Array<number>(playerCount).fill(0);

  indexed.forEach((entry, rank) => {
    finalScores[entry.index] = rawScores[entry.index] + uma[rank];
  });

  // オカをトップに加算
  finalScores[indexed[0].index] += Math.round(oka / 1000) * 10;

  return finalScores;
}
