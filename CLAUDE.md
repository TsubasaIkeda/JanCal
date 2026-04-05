# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

JanCal — 麻雀点数管理Webアプリケーション。GitHub Pagesで公開し、ルームIDを共有して複数端末からリアルタイムに点数を管理・同期する。3人麻雀・4人麻雀に対応。

## 技術スタック

- **フレームワーク:** Next.js 16 (App Router, TypeScript, 静的エクスポート)
- **CSS:** Tailwind CSS v4
- **リアルタイム同期:** PeerJS (WebRTC P2P)
- **ホスティング:** GitHub Pages
- **パッケージマネージャ:** npm

## 開発コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # 静的エクスポート（out/ディレクトリに出力）
npm run start        # ビルド済みファイルをローカルサーブ
npm run lint         # ESLint実行
```

## アーキテクチャ

```
src/
  app/
    page.tsx           # ホーム画面（ルーム作成/参加）
    game/page.tsx      # ゲーム画面（スコアボード・入力・履歴）
    layout.tsx         # 共通レイアウト
  lib/
    mahjong.ts         # 麻雀ロジック（点数計算、局名変換、ウマ・オカ）
    gameState.ts       # ゲーム状態の型定義と更新関数
    peer.ts            # PeerJS接続管理（RoomHost / RoomGuest）
  components/
    ScoreInputModal.tsx # スコア入力モーダル（アガリ/流局/手動）
.github/workflows/
  deploy.yml           # GitHub Pages自動デプロイ
```

### P2P同期アーキテクチャ

- **ホスト**: ルーム作成者。ゲーム状態を管理し、全ゲストにブロードキャスト
- **ゲスト**: ルームIDで参加。アクションをホストに送信し、状態更新を受信
- PeerJSのクラウドシグナリングサーバー経由でWebRTC接続を確立（インターネット越しでも可能）
- ルームIDは6文字の英数字（PeerJSのpeer IDとして使用、プレフィックス `jancal-`）

### ページ遷移

- `/` → ルーム作成（プレイヤー名入力 → ID発行）/ ルーム参加（ID入力）
- `/game?room=XXXX&role=host|guest` → ゲーム画面

## 重要な注意点

- `output: "export"` による完全静的サイト（サーバーサイド機能なし）
- `basePath`は環境変数 `NEXT_PUBLIC_BASE_PATH` で制御（GitHub Pages: `/JanCal`）
- PeerJSはSSR非対応のため、`"use client"` コンポーネントでのみ使用
- ホスト端末がルームの状態を保持。ホストが切断するとゲストも切断される
