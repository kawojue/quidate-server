import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const populate = async () => {
    await prisma.prices.create({
        data: {
            tradeType: 'SELL',
            currentPrice: 1550,
            currency: 'USD',
            desc: "Selling price for the conversion of USD to NGN"
        }
    })

    await prisma.prices.create({
        data: {
            tradeType: 'BUY',
            currentPrice: 1460,
            currency: 'USD',
            desc: "Buying price for the conversion of USD to NGN"
        }
    })
}

populate()