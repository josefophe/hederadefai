/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_username_key" ON "Wallet"("username");
