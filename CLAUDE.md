# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

JanCal — 麻雀点数管理Webアプリケーション。ローカルネットワーク上で複数端末からホストサーバーにアクセスし、リアルタイムに点数を管理・同期する。

## 技術スタック

- **フレームワーク:** Next.js 16 (App Router, TypeScript)
- **CSS:** Tailwind CSS v4
- **ORM/DB:** Prisma v7 + SQLite（`@prisma/adapter-libsql`経由）
- **リアルタイム同期:** Socket.io (WebSocket)
- **パッケージマネージャ:** npm
- **TS実行:** tsx（カスタムサーバー用）

## 開発コマンド

```bash
# 開発サーバー起動（0.0.0.0:3000でリッスン、LAN内の他端末からアクセス可能）
npm run dev

# ビルド・本番起動
npm run build
npm run start

# lint
npm run lint

# Prismaスキーマ変更後
npx prisma migrate dev        # マイグレーション作成・適用
npx prisma generate           # クライアント再生成
npx prisma studio             # DBブラウザ起動
```

## アーキテクチャ

```
server.ts              # カスタムHTTPサーバー（Next.js + Socket.io統合）
prisma.config.ts       # Prisma設定（DB接続先）
src/
  app/                 # Next.js App Router
    api/games/         # ゲームCRUD API
    api/games/[id]/    # ゲーム詳細・終了API
    api/games/[id]/rounds/  # ラウンド（局）スコア記録API
    game/[id]/         # ゲーム画面（スコアボード・入力）
    history/           # 過去のゲーム一覧
  lib/
    prisma.ts          # Prismaクライアントシングルトン
    socket.ts          # Socket.ioクライアント（ブラウザ側）
    mahjong.ts         # 麻雀ロジック（局名変換、最終スコア計算）
  generated/
    prisma/            # Prisma生成クライアント（.gitignore済み）
prisma/
  schema.prisma        # DBスキーマ（Game, GamePlayer, Round, Score）
  dev.db               # SQLiteデータベースファイル（.gitignore済み）
```

### カスタムサーバー構成

`server.ts`がHTTPサーバーを起動し、Next.jsのリクエストハンドラとSocket.ioを同一ポートで統合している。`npm run dev`は`tsx server.ts`を実行する（`next dev`ではない）。

### リアルタイム同期

Socket.ioでゲームルーム単位のリアルタイム通知を実装。スコア更新・ゲーム終了イベントを全接続端末に即座にブロードキャストする。

## 重要な注意点

- Prisma v7ではドライバーアダプター（`@prisma/adapter-libsql`）が必須。`PrismaClient`のコンストラクタに`adapter`を渡す必要がある
- Prisma生成コード (`src/generated/prisma`) はgit管理外。`npm install` 後に `npx prisma generate` が必要
- SQLiteのDBファイル (`prisma/dev.db`) はgit管理外
- `next.config.ts`で`turbopack.root`を設定済み（日本語パス対応）
