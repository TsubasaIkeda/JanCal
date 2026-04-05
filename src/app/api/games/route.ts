import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ゲーム一覧取得
export async function GET() {
  const games = await prisma.game.findMany({
    include: { players: { orderBy: { seat: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(games);
}

// ゲーム作成
export async function POST(request: Request) {
  const body = await request.json();
  const { playerNames, initialPoints = 25000, returnPoints = 30000 } = body as {
    playerNames: string[];
    initialPoints?: number;
    returnPoints?: number;
  };

  if (!playerNames || (playerNames.length !== 3 && playerNames.length !== 4)) {
    return NextResponse.json({ error: "3人または4人のプレイヤー名が必要です" }, { status: 400 });
  }

  const game = await prisma.game.create({
    data: {
      playerCount: playerNames.length,
      initialPoints,
      returnPoints,
      players: {
        create: playerNames.map((name, i) => ({ name, seat: i })),
      },
    },
    include: { players: { orderBy: { seat: "asc" } } },
  });

  return NextResponse.json(game);
}
