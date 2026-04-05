import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ゲーム詳細取得（プレイヤー・全ラウンド・スコア込み）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      players: { orderBy: { seat: "asc" } },
      rounds: {
        orderBy: [{ roundNum: "asc" }, { honba: "asc" }],
        include: { scores: true },
      },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "ゲームが見つかりません" }, { status: 404 });
  }

  return NextResponse.json(game);
}

// ゲーム終了
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const game = await prisma.game.update({
    where: { id },
    data: { status: "finished" },
  });

  return NextResponse.json(game);
}
