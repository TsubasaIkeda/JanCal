// 局番号から表示名に変換（0=東1局, 4=南1局, ...）
export function roundLabel(roundNum: number): string {
  const winds = ["東", "南", "西", "北"];
  const windIndex = Math.floor(roundNum / 4);
  const num = (roundNum % 4) + 1;
  return `${winds[windIndex] ?? "?"}${num}局`;
}

// ウマ・オカを含む最終スコア計算
export function calcFinalScores(
  currentPoints: number[],
  initialPoints: number,
  returnPoints: number
): number[] {
  // オカ = (返し - 持ち) × 4 をトップに加算
  const oka = (returnPoints - initialPoints) * 4;

  // 素点（返し点を基準にした差分、千点単位）
  const rawScores = currentPoints.map(
    (p) => Math.round((p - returnPoints) / 1000) * 10
  );

  // 順位でソート（同点は席順優先）
  const indexed = currentPoints.map((p, i) => ({ points: p, index: i }));
  indexed.sort((a, b) => b.points - a.points);

  // ウマ（10-20）
  const uma = [20, 10, -10, -20];
  const finalScores = new Array<number>(4).fill(0);

  indexed.forEach((entry, rank) => {
    finalScores[entry.index] = rawScores[entry.index] + uma[rank];
  });

  // オカをトップに加算
  finalScores[indexed[0].index] += Math.round(oka / 1000) * 10;

  return finalScores;
}
