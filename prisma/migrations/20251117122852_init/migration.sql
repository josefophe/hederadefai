/*
  Warnings:

  - Added the required column `accountId` to the `Wallet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicKey` to the `Wallet` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "AssociatedToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    CONSTRAINT "AssociatedToken_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "address" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Wallet" ("address", "createdAt", "id", "privateKey", "telegramId", "username") SELECT "address", "createdAt", "id", "privateKey", "telegramId", "username" FROM "Wallet";
DROP TABLE "Wallet";
ALTER TABLE "new_Wallet" RENAME TO "Wallet";
CREATE UNIQUE INDEX "Wallet_telegramId_key" ON "Wallet"("telegramId");
CREATE UNIQUE INDEX "Wallet_username_key" ON "Wallet"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
