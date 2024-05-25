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

    async biometricCheck(userId: string, type: 'Login' | 'Tx') {
        const user = await this.user.findUnique({
            where: { id: userId },
            select: {
                lastLoggedInAt: true,
                lastPasswordChanged: true,
                lastUsedBiometricAt: true,
            }
        })

        const profile = await this.profile.findUnique({
            where: { userId },
            select: { lastPinChanged: true }
        })

        if (!user) {
            throw new Error('User not found')
        }

        const { lastLoggedInAt, lastPasswordChanged, lastUsedBiometricAt } = user

        if (type === 'Login') {
            if (!lastUsedBiometricAt || lastLoggedInAt > lastUsedBiometricAt || lastPasswordChanged > lastUsedBiometricAt) {
                return {
                    isAbleToUseBiometric: false,
                    reason: 'Password required due to recent login or password change.'
                }
            }
        } else if (type === 'Tx') {
            if (!profile) {
                throw new Error('Profile not found')
            }
            const { lastPinChanged } = profile

            if (!lastUsedBiometricAt || lastPinChanged > lastUsedBiometricAt) {
                return {
                    isAbleToUseBiometric: false,
                    reason: 'PIN required due to recent PIN change.'
                }
            }
        }

        return { isAbleToUseBiometric: true }
    }
}