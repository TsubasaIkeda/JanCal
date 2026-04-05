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
