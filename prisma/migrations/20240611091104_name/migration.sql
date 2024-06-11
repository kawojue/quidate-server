/*
  Warnings:

  - You are about to drop the `walletAccount` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_accountId_fkey";

-- DropTable
DROP TABLE "walletAccount";

-- CreateTable
CREATE TABLE "WalletAccount" (
    "id" UUID NOT NULL,
    "uid" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "fiatCurrency" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "showInDashboard" BOOLEAN NOT NULL,
    "isDeleted" BOOLEAN NOT NULL,
    "isArchived" BOOLEAN NOT NULL,
    "organizationId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "mode" TEXT NOT NULL,
    "maxDailyAmount" INTEGER NOT NULL,
    "maxMonthlyAmount" INTEGER NOT NULL,
    "maxDailyTransactionsCount" INTEGER NOT NULL,
    "maxMonthlyTransactionsCount" INTEGER NOT NULL,
    "whiteListAddresses" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "received" TEXT NOT NULL DEFAULT '0.00',
    "sent" TEXT NOT NULL DEFAULT '0.00',
    "balance" TEXT NOT NULL DEFAULT '0.00',
    "pending" TEXT NOT NULL DEFAULT '0.00',
    "blocked" TEXT NOT NULL DEFAULT '0.00',

    CONSTRAINT "WalletAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletAccount_uid_key" ON "WalletAccount"("uid");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WalletAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
