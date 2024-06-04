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

    async getUserWallet(userId: string) {
        return await this.wallet.findUnique({
            where: { userId }
        })
    }

    async getProfile(userId: string) {
        return await this.profile.findUnique({
            where: { userId }
        })
    }

    async manageBalance(
        userId: string, balField: 'ngnBalance' | 'usdBalance',
        amount: number, action: 'increment' | 'decrement',
    ) {
        await this.wallet.update({
            where: { userId },
            data: {
                [balField]: {
                    [action]: amount
                }
            }
        })
    }

    async constraints(userId: string) {
        const [
            linkedBanksCount, walletAddressesCount,
            IdVerification, proofOfAddress, addressCount,
        ] = await this.$transaction([
            this.linkedBank.count({ where: { userId } }),
            this.walletAddress.count({ where: { userId } }),
            this.kyc.findFirst({
                where: { userId, type: 'BASIC' },
                select: { verified: true },
            }),
            this.kyc.findFirst({
                where: { userId, type: 'UTILITY' },
                select: { verified: true }
            }),
            this.address.count({ where: { userId } })
        ])

        return {
            proofOfAddress, IdVerification,
            hasAddedAddress: addressCount > 0,
            hasLinkedAccount: linkedBanksCount > 0,
            hasAssignedAddresses: walletAddressesCount > 0,
        }
    }
}