export type Player = {
  name: string;
  seat: number;
};

export type RoundScore = {
  seat: number;
  points: number;
};

export type Round = {
  roundNum: number;
  honba: number;
  scores: RoundScore[];
  riichiSeats: number[];
};

export type GameState = {
  roomId: string;
  status: "waiting" | "active" | "finished";
  playerCount: number;
  initialPoints: number;
  returnPoints: number;
  kyotaku: number;
  players: Player[];
  rounds: Round[];
};

export function createInitialState(
  roomId: string,
  playerCount: number,
  playerNames: string[],
  initialPoints: number,
  returnPoints: number,
): GameState {
  return {
    roomId,
    status: "active",
    playerCount,
    initialPoints,
    returnPoints,
    kyotaku: 0,
    players: playerNames.map((name, i) => ({ name, seat: i })),
    rounds: [],
  };
}

export function addRound(
  state: GameState,
  roundNum: number,
  honba: number,
  scores: number[],
  kyotakuAfter: number,
  riichiSeats: number[] = [],
): GameState {
  const roundScores = state.players.map((p, i) => ({
    seat: p.seat,
    points: scores[i],
  }));
  return {
    ...state,
    kyotaku: kyotakuAfter,
    rounds: [...state.rounds, { roundNum, honba, scores: roundScores, riichiSeats }],
  };
}

export function deleteLastRound(state: GameState): GameState {
  if (state.rounds.length === 0) return state;
  return {
    ...state,
    rounds: state.rounds.slice(0, -1),
  };
}

export function finishGame(state: GameState): GameState {
  return { ...state, status: "finished" };
}

// 各プレイヤーの現在の持ち点を計算
export function getCurrentPoints(state: GameState): number[] {
  return state.players.map((player) => {
    const total = state.rounds.reduce((sum, round) => {
      const score = round.scores.find((s) => s.seat === player.seat);
      return sum + (score?.points ?? 0);
    }, 0);
    return state.initialPoints + total;
  });
}

// ルームIDを生成（6文字の英数字）
export function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
