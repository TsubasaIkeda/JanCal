import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ラウンド（局）のスコアを記録
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;
  const body = await request.json();
  const { roundNum, honba = 0, scores } = body as {
    roundNum: number;
    honba?: number;
    scores: { playerId: string; points: number }[];
  };

  // 点数の合計が0であることを検証（点棒の移動なので合計は0）
  const total = scores.reduce((sum, s) => sum + s.points, 0);
  if (total !== 0) {
    return NextResponse.json(
      { error: "点数の合計が0になりません" },
      { status: 400 }
    );
  }

  const round = await prisma.round.create({
    data: {
      gameId,
      roundNum,
      honba,
      scores: {
        create: scores.map((s) => ({
          playerId: s.playerId,
          points: s.points,
        })),
      },
    },
    include: { scores: true },
  });

  return NextResponse.json(round);
}

// ラウンド削除（直前の局を取り消し）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;
  const { searchParams } = new URL(request.url);
  const roundId = searchParams.get("roundId");

  if (!roundId) {
    return NextResponse.json({ error: "roundIdが必要です" }, { status: 400 });
  }

  await prisma.round.delete({
    where: { id: roundId, gameId },
  });

  return NextResponse.json({ success: true });
}
