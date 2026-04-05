"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REPO_URL = "https://github.com/TsubasaIkeda/JanCal";

const CATEGORIES = [
  { value: "bug", label: "不具合報告", emoji: "bug" },
  { value: "feature", label: "機能リクエスト", emoji: "sparkles" },
  { value: "question", label: "質問", emoji: "question" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

export default function ContactPage() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>("bug");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const selectedCategory = CATEGORIES.find((c) => c.value === category)!;

  const handleSubmit = () => {
    if (title.trim() === "") return;

    const issueTitle = `[${selectedCategory.label}] ${title.trim()}`;
    const issueBody = body.trim() || "(詳細なし)";

    const params = new URLSearchParams({
      title: issueTitle,
      body: issueBody,
      labels: category,
    });

    window.open(`${REPO_URL}/issues/new?${params.toString()}`, "_blank");
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">お問い合わせ</h1>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ← 戻る
          </button>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900 space-y-4">
          {/* カテゴリ選択 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              カテゴリ
            </label>
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    category === cat.value
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* タイトル */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              タイトル
            </label>
            <input
              type="text"
              placeholder="簡潔にまとめてください"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          {/* 内容 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              内容
            </label>
            <textarea
              placeholder="詳細を記入してください"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={title.trim() === ""}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            GitHubで起票する
          </button>

          <p className="text-center text-xs text-gray-400">
            GitHubアカウントが必要です
          </p>
        </div>
      </div>
    </div>
  );
}
