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
  // 親が連荘するか（親アガリ・流局親テンパイ）
  dealerContinues?: boolean;
  // 本場をリセットするか（子アガリ）
  resetHonba?: boolean;
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
  dealerContinues: boolean = false,
  resetHonba: boolean = true,
): GameState {
  // 冪等性: 同じ (roundNum, honba) が既にあれば追加しない
  // 複数端末から同時に同じ局が送信されたときの重複を防ぐ
  const exists = state.rounds.some(
    (r) => r.roundNum === roundNum && r.honba === honba,
  );
  if (exists) return state;

  const roundScores = state.players.map((p, i) => ({
    seat: p.seat,
    points: scores[i],
  }));
  return {
    ...state,
    kyotaku: kyotakuAfter,
    rounds: [
      ...state.rounds,
      { roundNum, honba, scores: roundScores, riichiSeats, dealerContinues, resetHonba },
    ],
  };
}

export function deleteLastRound(state: GameState): GameState {
  if (state.rounds.length === 0) return state;
  return {
    ...state,
    rounds: state.rounds.slice(0, -1),
  };
}

// 2席のプレイヤー名を入れ替える。点数履歴は席に紐づいたまま残る。
export function swapPlayers(
  state: GameState,
  seatA: number,
  seatB: number,
): GameState {
  if (seatA === seatB) return state;
  const idxA = state.players.findIndex((p) => p.seat === seatA);
  const idxB = state.players.findIndex((p) => p.seat === seatB);
  if (idxA === -1 || idxB === -1) return state;
  const players = state.players.map((p) => ({ ...p }));
  const tmp = players[idxA].name;
  players[idxA].name = players[idxB].name;
  players[idxB].name = tmp;
  return { ...state, players };
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

// localStorage 永続化
const STORAGE_PREFIX = "jancal:state:";

export function saveState(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + state.roomId, JSON.stringify(state));
  } catch {
    // quota超過などは握り潰す
  }
}

export function loadState(roomId: string): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + roomId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.roomId !== roomId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearState(roomId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + roomId);
  } catch {
    // noop
  }
}
