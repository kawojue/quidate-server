import { PrismaService } from 'prisma'
import { Injectable } from '@nestjs/common'

@Injectable()
export class PriceConversionService {
    private prisma: PrismaService

    constructor() {
        this.prisma = new PrismaService
    }

    async convert_currency(amount: number, type: 'NGN_TO_USD' | 'USD_TO_NGN') {
        let pricePerUnit: {
            price: number
            rate: number
        }

        if (type === 'NGN_TO_USD') {
            const { currentPrice } = await this.prisma.prices.findFirst({
                where: {
                    currency: 'USD',
                    tradeType: 'SELL'
                }
            })
            pricePerUnit = {
                rate: currentPrice,
                price: amount / currentPrice
            }
        } else if (type === 'USD_TO_NGN') {
            const { currentPrice } = await this.prisma.prices.findFirst({
                where: {
                    currency: 'USD',
                    tradeType: 'BUY'
                }
            })
            pricePerUnit = {
                rate: currentPrice,
                price: amount * currentPrice
            }
        } else {
            return
        }

        return pricePerUnit
    }
}