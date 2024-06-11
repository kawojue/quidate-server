-- CreateTable
CREATE TABLE "Redeem" (
    "id" UUID NOT NULL,
    "productId" INTEGER NOT NULL,
    "txId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Redeem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedeemCode" (
    "id" UUID NOT NULL,
    "pinCode" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "redeemId" UUID NOT NULL,

    CONSTRAINT "RedeemCode_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Redeem" ADD CONSTRAINT "Redeem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemCode" ADD CONSTRAINT "RedeemCode_redeemId_fkey" FOREIGN KEY ("redeemId") REFERENCES "Redeem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
