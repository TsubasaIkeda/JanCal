// ホーム画面の入力やルーム情報の永続化（localStorage）

const SETUP_KEY = "jancal:setup";
const LAST_ROOM_KEY = "jancal:lastRoom";

export type SetupPrefs = {
  playerCount: 3 | 4;
  playerNames: string[];
  initialPoints: number;
  returnPoints: number;
  joinRoomId: string;
};

export type LastRoom = {
  roomId: string;
  role: "host" | "guest";
  updatedAt: number;
};

export function saveSetupPrefs(prefs: SetupPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(prefs));
  } catch {
    // quota超過などは握り潰す
  }
}

export function loadSetupPrefs(): SetupPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SETUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SetupPrefs;
  } catch {
    return null;
  }
}

export function saveLastRoom(roomId: string, role: "host" | "guest"): void {
  if (typeof window === "undefined") return;
  try {
    const value: LastRoom = { roomId, role, updatedAt: Date.now() };
    localStorage.setItem(LAST_ROOM_KEY, JSON.stringify(value));
  } catch {
    // noop
  }
}

export function loadLastRoom(): LastRoom | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_ROOM_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastRoom;
  } catch {
    return null;
  }
}

export function clearLastRoom(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LAST_ROOM_KEY);
  } catch {
    // noop
  }
}
