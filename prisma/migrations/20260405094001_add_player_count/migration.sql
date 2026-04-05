-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "playerCount" INTEGER NOT NULL DEFAULT 4,
    "initialPoints" INTEGER NOT NULL DEFAULT 25000,
    "returnPoints" INTEGER NOT NULL DEFAULT 30000
);
INSERT INTO "new_Game" ("createdAt", "id", "initialPoints", "returnPoints", "status") SELECT "createdAt", "id", "initialPoints", "returnPoints", "status" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
