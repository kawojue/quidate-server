import { PrismaClient } from '@prisma/client'
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect()
    }

    async onModuleDestroy() {
        await this.$disconnect()
    }

    async getUserWithVirtualAccount(userId: string) {
        return await this.user.findUnique({
            where: {
                id: userId
            },
            include: {
                virtualAccount: true
            }
        })
    }

    async hasCreatedFreeInvoicesTwiceThisMonth(userId: string) {
        const currentDate = new Date()
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0)
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)

        const count = await this.invoice.count({
            where: {
                userId,
                isFree: true,
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
        })

        return count >= 2
    }
}