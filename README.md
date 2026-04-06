# JanCal - 麻雀点数管理

[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue)](https://tsubasaikeda.github.io/JanCal/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

麻雀の点数をリアルタイムに管理・計算するWebアプリケーション。

ルームIDを共有するだけで、複数端末から同じゲームに参加できます。サーバー不要、ブラウザだけで動作します。

## 主な機能

- **ルーム共有** - 6文字のルームIDで複数端末からリアルタイム同期
- **点数自動計算** - 翻/符を入力するだけで、ツモ/ロンの支払い分配を自動計算
- **リーチ対応** - リーチ棒の供託管理と回収を自動計算
- **3人/4人麻雀** - 3麻・4麻の切り替えに対応
- **流局処理** - テンパイ料の自動計算
- **ウマ・オカ** - ゲーム終了時の最終スコアを自動計算

## 使い方

### ルーム作成（ホスト）

1. トップページで「ルーム作成」を選択
2. プレイヤー名を入力（3人 or 4人）
3. 「ルーム作成」ボタンをタップ
4. 表示されるルームIDを他の人に共有

### ルーム参加（ゲスト）

1. トップページで「ルーム参加」を選択
2. 共有されたルームIDを入力
3. 「ルームに参加」ボタンをタップ

### スコア入力

- **アガリ** - アガリ者 → ツモ/ロン → 放銃者(ロン時) → リーチ者 → 翻/符 or プリセット
- **流局** - テンパイ者 → リーチ者を選択
- **手動** - 各プレイヤーの点数変動を直接入力

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 16 (App Router, TypeScript) |
| CSS | Tailwind CSS v4 |
| リアルタイム同期 | PeerJS (WebRTC P2P) |
| ホスティング | GitHub Pages |

## 開発

```bash
npm install
npm run dev      # http://localhost:3000 で開発サーバー起動
npm run build    # 静的ファイルを out/ に出力
npm run lint     # ESLint 実行
```

## デプロイ

`main` ブランチにpushすると、GitHub Actionsが自動的にGitHub Pagesにデプロイします。

手動デプロイ:

```bash
NEXT_PUBLIC_BASE_PATH=/JanCal npm run build
# out/ ディレクトリを任意のホスティングにアップロード
```

## アーキテクチャ

完全にクライアントサイドで動作する静的Webアプリです。

- **ホスト端末** がゲーム状態を管理し、全ゲストにブロードキャスト
- **ゲスト端末** はアクションをホストに送信し、状態更新を受信
- PeerJSのクラウドシグナリングサーバー経由でWebRTC接続を確立
- サーバー・データベース不要。インターネット越しでも動作可能

## コントリビューション

Issue や Pull Request は歓迎です。バグ報告や機能リクエストは [Issues](https://github.com/TsubasaIkeda/JanCal/issues) からお願いします。

## ライセンス

[MIT License](LICENSE)
