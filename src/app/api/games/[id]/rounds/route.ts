import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ラウンド（局）のスコアを記録
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;
  const body = await request.json();
  const { roundNum, honba = 0, scores, kyotakuAfter } = body as {
    roundNum: number;
    honba?: number;
    scores: { playerId: string; points: number }[];
    kyotakuAfter?: number;
  };

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

  // 供託の更新
  if (kyotakuAfter !== undefined) {
    await prisma.game.update({
      where: { id: gameId },
      data: { kyotaku: kyotakuAfter },
    });
  }

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
  const kyotakuAfter = searchParams.get("kyotakuAfter");

  if (!roundId) {
    return NextResponse.json({ error: "roundIdが必要です" }, { status: 400 });
  }

  await prisma.round.delete({
    where: { id: roundId, gameId },
  });

  if (kyotakuAfter !== null) {
    await prisma.game.update({
      where: { id: gameId },
      data: { kyotaku: parseInt(kyotakuAfter, 10) },
    });
  }

  return NextResponse.json({ success: true });
}
