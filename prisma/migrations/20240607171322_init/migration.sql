-- CreateEnum
CREATE TYPE "Roles" AS ENUM ('user', 'admin', 'moderator');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('ETH', 'BTC', 'BSC', 'USDT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('suspended', 'active');

-- CreateEnum
CREATE TYPE "TransactionCurrency" AS ENUM ('USD', 'NGN');

-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('SELL', 'BUY');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('FAILED', 'PENDING', 'SUCCESS', 'COMPLETED', 'REVERSED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'RESOURCE', 'GIFTCARD', 'CONVERSION', 'DISBURSEMENT');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('crypto', 'fiat');

-- CreateEnum
CREATE TYPE "Method" AS ENUM ('POST', 'DELETE', 'PATCH', 'PUT', 'GET', 'OPTION');

-- CreateEnum
CREATE TYPE "LeveLName" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('in_app', 'provider');

-- CreateEnum
CREATE TYPE "KycType" AS ENUM ('BASIC', 'UTILITY');

-- CreateEnum
CREATE TYPE "MeansOfID" AS ENUM ('NIN', 'BVN', 'Passport', 'VotersCard', 'UtilityBill', 'DriverLicense');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dailyWithdrawalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastWithdrawalReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userStatus" "UserStatus" NOT NULL DEFAULT 'active',
    "role" "Roles" NOT NULL DEFAULT 'user',
    "lastUsedBiometricAt" TIMESTAMP(3),
    "lastUsedCredAt" TIMESTAMP(3),
    "lastLoggedInAt" TIMESTAMP(3),
    "lastPasswordChanged" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "levelId" UUID NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "phoneWithCountryCode" TEXT,
    "pin" TEXT,
    "lastPinChanged" TIMESTAMP(3),
    "deviceToken" TEXT,
    "primaryAsset" "AssetType",
    "avatar" JSONB,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "userId" UUID NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" UUID NOT NULL,
    "line1" TEXT,
    "lin2" TEXT,
    "state" TEXT,
    "city" TEXT,
    "country" TEXT,
    "postal_code" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kyc" (
    "id" UUID NOT NULL,
    "type" "KycType" NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "id_no" TEXT,
    "additional_notes" TEXT,
    "country" TEXT NOT NULL,
    "means_of_id" "MeansOfID" NOT NULL,
    "proof_of_id" JSONB[],
    "dob" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ip" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "ip" TEXT,
    "type" TEXT,
    "continent" TEXT,
    "continentCode" TEXT,
    "country" TEXT,
    "countryCode" TEXT,
    "region" TEXT,
    "regionCode" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isEu" BOOLEAN,
    "postal" TEXT,
    "callingCode" TEXT,
    "capital" TEXT,
    "borders" TEXT,
    "flagImg" TEXT,
    "flagEmoji" TEXT,
    "flagEmojiUnicode" TEXT,
    "connectionAsn" INTEGER,
    "connectionOrg" TEXT,
    "connectionIsp" TEXT,
    "connectionDomain" TEXT,
    "currencyName" TEXT,
    "currencyCode" TEXT,
    "currencySymbol" TEXT,
    "currencyPlural" TEXT,

    CONSTRAINT "Ip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" UUID NOT NULL,
    "name" "LeveLName" NOT NULL DEFAULT 'TIER_1',
    "constraintId" UUID NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelConstraint" (
    "id" UUID NOT NULL,
    "maxDailyWithdrawal" DOUBLE PRECISION NOT NULL,
    "maxSingleWithdrawal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "LevelConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelConstraintTierOne" (
    "id" UUID NOT NULL,
    "name" "LeveLName" NOT NULL DEFAULT 'TIER_1',
    "maxDailyWithdrawal" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "maxSingleWithdrawal" DOUBLE PRECISION NOT NULL DEFAULT 50000,

    CONSTRAINT "LevelConstraintTierOne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelConstraintTierTwo" (
    "id" UUID NOT NULL,
    "name" "LeveLName" NOT NULL DEFAULT 'TIER_2',
    "maxDailyWithdrawal" DOUBLE PRECISION NOT NULL DEFAULT 1000000,
    "maxSingleWithdrawal" DOUBLE PRECISION NOT NULL DEFAULT 200000,

    CONSTRAINT "LevelConstraintTierTwo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelConstraintTierThree" (
    "id" UUID NOT NULL,
    "name" "LeveLName" NOT NULL DEFAULT 'TIER_3',
    "maxDailyWithdrawal" DOUBLE PRECISION NOT NULL DEFAULT 1000000000,
    "maxSingleWithdrawal" DOUBLE PRECISION NOT NULL DEFAULT 500000,

    CONSTRAINT "LevelConstraintTierThree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlacklistedIP" (
    "id" UUID NOT NULL,
    "ip" TEXT NOT NULL,

    CONSTRAINT "BlacklistedIP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modmin" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Roles" NOT NULL DEFAULT 'moderator',
    "status" "UserStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "Modmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cache" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER,
    "expires_in" INTEGER,
    "scope" TEXT,
    "token_type" TEXT,
    "access_token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Totp" (
    "id" UUID NOT NULL,
    "otp" TEXT,
    "otp_expiry" TIMESTAMP(3),
    "userId" UUID NOT NULL,

    CONSTRAINT "Totp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" UUID NOT NULL,
    "ip" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "query" TEXT,
    "os" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "deviceType" TEXT,
    "method" "Method" NOT NULL,
    "full_url" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "requestSize" TEXT NOT NULL,
    "responseSize" TEXT NOT NULL,
    "elapsedTimeDuration" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "responsedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,
    "modminId" UUID,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" UUID NOT NULL,
    "ngnBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "usdBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "dummyUsdBalance" DOUBLE PRECISION DEFAULT 0.00,
    "dummyNGNBalance" DOUBLE PRECISION DEFAULT 0.00,
    "lastAmountWithdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "lastAmountDeposited" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "lastWithdrewAt" TIMESTAMP(3),
    "lasCurrencyEffect" "TransactionCurrency",
    "lastDepoistedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkedBank" (
    "id" UUID NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "LinkedBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipient" (
    "id" UUID NOT NULL,
    "recipient_type" "RecipientType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "domain" TEXT,
    "recipient_id" INTEGER,
    "recipient_code" TEXT,
    "integration" INTEGER,
    "type" TEXT DEFAULT 'nuban',
    "bank_code" TEXT,
    "bank_name" TEXT,
    "account_name" TEXT,
    "account_number" TEXT,
    "authorization_code" TEXT,
    "fullname" TEXT,
    "username" TEXT,
    "userId" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prices" (
    "id" UUID NOT NULL,
    "assetType" TEXT,
    "label" TEXT,
    "currentPrice" DOUBLE PRECISION,
    "ngn_current_price" DOUBLE PRECISION,
    "usd_current_price" DOUBLE PRECISION,
    "ngn_1h_price" DOUBLE PRECISION,
    "usd_1h_price" DOUBLE PRECISION,
    "ngn_24h_price" DOUBLE PRECISION,
    "usd_24h_price" DOUBLE PRECISION,
    "usd_24h_change" DOUBLE PRECISION,
    "ngn_24h_change" DOUBLE PRECISION,
    "timestampCurrent" INTEGER,
    "timestamp1hr" INTEGER,
    "timestamp24hr" INTEGER,
    "currency" "TransactionCurrency",
    "tradeType" "TradeType",
    "walletId" TEXT,
    "desc" TEXT,

    CONSTRAINT "Prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletAddress" (
    "id" UUID NOT NULL,
    "uid" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "addressRef" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "addressType" TEXT NOT NULL,
    "isContract" BOOLEAN NOT NULL,
    "isChangeAddress" BOOLEAN NOT NULL,
    "derivationIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "subAccountId" TEXT,
    "used" BOOLEAN NOT NULL,
    "addressContractIdentifier" TEXT,
    "deploymentParams" JSONB,
    "lastUsedAt" DATE,
    "userId" UUID NOT NULL,

    CONSTRAINT "WalletAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walletAccount" (
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

    CONSTRAINT "walletAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "uid" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL,
    "isArchived" BOOLEAN NOT NULL,
    "isContract" BOOLEAN NOT NULL,
    "chain" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "autoForwardAddress" TEXT,
    "received" TEXT NOT NULL DEFAULT '0.00',
    "sent" TEXT NOT NULL DEFAULT '0.00',
    "balance" TEXT NOT NULL DEFAULT '0.00',
    "pending" TEXT NOT NULL DEFAULT '0.00',
    "blocked" TEXT NOT NULL DEFAULT '0.00',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "accountId" UUID NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionHistory" (
    "id" UUID NOT NULL,
    "ip" TEXT,
    "tx_id" TEXT,
    "ref" TEXT NOT NULL,
    "hash" TEXT,
    "type" "TransactionType" NOT NULL,
    "chain" TEXT,
    "label" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "settlementAmount" DOUBLE PRECISION,
    "recipient" INTEGER,
    "customer_code" TEXT,
    "transferCode" TEXT,
    "nairaAmount" DOUBLE PRECISION,
    "dollarAmount" DOUBLE PRECISION,
    "dollarRate" DOUBLE PRECISION,
    "status" "TransferStatus" NOT NULL,
    "source" "TransactionSource" NOT NULL,
    "sourceType" TEXT,
    "address" TEXT,
    "assetId" TEXT,
    "assetType" TEXT,
    "blockHash" TEXT,
    "timestamp" TEXT,
    "blockHeight" TEXT,
    "inward_source" "TransactionCurrency",
    "outward_source" "TransactionCurrency",
    "confirmation" INTEGER,
    "description" TEXT,
    "senderAddress" TEXT,
    "idempotencyKey" TEXT,
    "broadcastedAt" TIMESTAMP(3),
    "processingFee" DOUBLE PRECISION,
    "paystackFee" DOUBLE PRECISION,
    "totalFee" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destinationAccountName" TEXT,
    "destinationAccountNumber" TEXT,
    "destinationBankCode" TEXT,
    "destinationBankName" TEXT,
    "sourceAccountName" TEXT,
    "sourceAccountNumber" TEXT,
    "sourceBankCode" TEXT,
    "sourceBankName" TEXT,
    "sourceAccountCountry" TEXT,
    "channel" TEXT,
    "currency" "TransactionCurrency",
    "narration" TEXT,
    "authorization_code" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "TransactionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hash" TEXT,
    "reference" TEXT,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "issuer_name" TEXT NOT NULL,
    "issuer_email" TEXT NOT NULL,
    "issuer_phone" TEXT NOT NULL,
    "currency" "TransactionCurrency" NOT NULL,
    "clientInfo" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "bankName" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "walletAddress" TEXT,
    "mode" TEXT,
    "chain" TEXT,
    "label" TEXT,
    "network" TEXT,
    "assetId" TEXT,
    "assetType" "AssetType",
    "addressType" TEXT,
    "orderNo" TEXT,
    "items" JSONB[],
    "paymentType" "TransactionSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT,
    "description" TEXT NOT NULL,
    "attachments" JSONB[],

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_phone_key" ON "Profile"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_userId_key" ON "Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Kyc_id_no_key" ON "Kyc"("id_no");

-- CreateIndex
CREATE UNIQUE INDEX "Ip_userId_key" ON "Ip"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Level_name_key" ON "Level"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Level_constraintId_key" ON "Level"("constraintId");

-- CreateIndex
CREATE UNIQUE INDEX "BlacklistedIP_ip_key" ON "BlacklistedIP"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "Modmin_email_key" ON "Modmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cache_key_key" ON "Cache"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Totp_userId_key" ON "Totp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Log_userId_key" ON "Log"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Log_modminId_key" ON "Log"("modminId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedBank_userId_key" ON "LinkedBank"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipient_recipient_code_key" ON "Recipient"("recipient_code");

-- CreateIndex
CREATE UNIQUE INDEX "Recipient_userId_key" ON "Recipient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Prices_walletId_key" ON "Prices"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAddress_uid_key" ON "WalletAddress"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAddress_userId_key" ON "WalletAddress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "walletAccount_uid_key" ON "walletAccount"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_uid_key" ON "Asset"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_accountId_key" ON "Asset"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionHistory_tx_id_key" ON "TransactionHistory"("tx_id");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionHistory_ref_key" ON "TransactionHistory"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionHistory_hash_key" ON "TransactionHistory"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionHistory_idempotencyKey_key" ON "TransactionHistory"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionHistory_userId_key" ON "TransactionHistory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_hash_key" ON "Notification"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_key" ON "Notification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_userId_key" ON "Invoice"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kyc" ADD CONSTRAINT "Kyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ip" ADD CONSTRAINT "Ip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_constraintId_fkey" FOREIGN KEY ("constraintId") REFERENCES "LevelConstraint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Totp" ADD CONSTRAINT "Totp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_modminId_fkey" FOREIGN KEY ("modminId") REFERENCES "Modmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedBank" ADD CONSTRAINT "LinkedBank_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipient" ADD CONSTRAINT "Recipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletAddress" ADD CONSTRAINT "WalletAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "walletAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionHistory" ADD CONSTRAINT "TransactionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
