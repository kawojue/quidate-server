import { Injectable } from '@nestjs/common'
import { PrismaService } from 'prisma/prisma.service'
import { ThreatIntelService } from './threat.service'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AssetMetadataService } from './asset-metadata.service'

@Injectable()
export class TaskService {
    private prisma: PrismaService

    constructor(
        private readonly assetMetadata: AssetMetadataService,
        private readonly threatIntelService: ThreatIntelService,
    ) {
        this.prisma = new PrismaService()
    }

    @Cron('0 0 * * *')
    async handleThreatIntel() {
        await this.threatIntelService.updateBlacklist()
    }

    @Cron(CronExpression.EVERY_HOUR)
    async handleAssetMetadata() {
        await this.assetMetadata.fetchPrice()
    }

    @Cron('0 0 * * *')
    async resetDailyWithdrawalLimits() {
        const batchSize = 1000
        let usersProcessed = 0

        while (true) {
            const users = await this.prisma.user.findMany({
                where: {
                    userStatus: 'active',
                    lastWithdrawalReset: {
                        lt: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
                select: { id: true },
                take: batchSize,
                skip: usersProcessed,
            })

            if (users.length === 0) {
                break
            }

            const userIds = users.map(user => user.id)

            await this.prisma.user.updateMany({
                where: {
                    id: { in: userIds },
                },
                data: {
                    dailyWithdrawalAmount: 0,
                    lastWithdrawalReset: new Date(),
                },
            })

            usersProcessed += users.length
        }
    }
}
