/*
  Warnings:

  - You are about to drop the column `address` on the `Wallet` table. All the data in the column will be lost.
  - Added the required column `evmAddress` to the `Wallet` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "evmAddress" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Wallet" ("accountId", "createdAt", "id", "privateKey", "publicKey", "telegramId", "username") SELECT "accountId", "createdAt", "id", "privateKey", "publicKey", "telegramId", "username" FROM "Wallet";
DROP TABLE "Wallet";
ALTER TABLE "new_Wallet" RENAME TO "Wallet";
CREATE UNIQUE INDEX "Wallet_telegramId_key" ON "Wallet"("telegramId");
CREATE UNIQUE INDEX "Wallet_username_key" ON "Wallet"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
