import { Response } from 'express'
import { AssetDTO } from './dto/asset.dto'
import { Injectable } from '@nestjs/common'
import { MiscService } from 'lib/misc.service'
import { StatusCodes } from 'enums/statusCodes'
import { RecipientDto } from './dto/recipient.dto'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { removeNullFields } from 'helpers/transformer'
import { TxAggregateDTO, TxHistoriesDto, TxHistoryDto } from './dto/history.dto'

@Injectable()
export class UserService {
  constructor(
    private readonly misc: MiscService,
    private readonly prisma: PrismaService,
    private readonly response: ResponseService,
  ) { }

  async me(res: Response, { sub: id }: ExpressUser) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          fullName: true,
          username: true,
          dailyWithdrawalAmount: true,
          level: {
            select: {
              name: true,
              constraints: {
                select: {
                  maxDailyWithdrawal: true,
                  maxSingleWithdrawal: true,
                }
              }
            }
          },
          profile: {
            select: {
              pin: true,
              avatar: true,
              primaryAsset: true,
              email_verified: true,
              phoneWithCountryCode: true,
            }
          },
        }
      })

      const profile = user.profile

      this.response.sendSuccess(res, StatusCodes.OK, {
        data: {
          email: user.email,
          level: user.level,
          username: user.username,
          fullname: user.fullName,
          phone: profile.phoneWithCountryCode,
          primaryAsset: profile.primaryAsset,
          isPinCreated: profile.pin !== null,
          ...(await this.prisma.constraints(id)),
          email_verified: user.profile.email_verified,
          // @ts-ignore
          avatar: profile?.avatar?.secure_url ?? null,
          dailyWithdrawalAmount: user.dailyWithdrawalAmount,
        },
      })
    } catch (err) {
      this.misc.handleServerError(res, err, "Error fetching Profile")
    }
  }

  async fetchAssetMetadata(res: Response, { sub: userId }: ExpressUser) {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { userId }
      })

      const metadata = await this.prisma.prices.findFirst({
        where: { assetType: profile?.primaryAsset ?? 'BTC' }
      })

      this.response.sendSuccess(res, StatusCodes.OK, { data: metadata })
    } catch (err) {
      this.misc.handleServerError(res, err, "Error fetching asset metadata")
    }
  }

  async switchPrimaryAsset(
    res: Response,
    { q }: AssetDTO,
    { sub }: ExpressUser,
  ) {
    try {
      await this.prisma.profile.update({
        where: { userId: sub },
        data: { primaryAsset: q }
      })

      this.response.sendSuccess(res, StatusCodes.OK, { message: `Primary asset switched to ${q}` })
    } catch (err) {
      this.misc.handleServerError(res, err, "Error switching primary asset")
    }
  }

  async fetchTransactionHistories(
    res: Response,
    { sub: userId }: ExpressUser,
    {
      page = 1,
      limit = 20,
      endDate = '',
      startDate = '',
      source = null,
      type = null,
      status = null,
    }: TxHistoriesDto,
  ) {
    try {
      page = Number(page)
      limit = Number(limit)
      const offset = (page - 1) * limit

      const txHistories = await this.prisma.transactionHistory.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate !== '' ? new Date(startDate) : new Date(0),
            lte: endDate !== '' ? new Date(endDate) : new Date(),
          },
          type: type !== null ? type : undefined,
          status: status !== null ? status : undefined,
          source: source !== null ? source : undefined,
        },
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      })

      const totalItems = await this.prisma.transactionHistory.count({
        where: {
          userId,
          createdAt: {
            gte: startDate !== '' ? new Date(startDate) : new Date(0),
            lte: endDate !== '' ? new Date(endDate) : new Date(),
          },
          type: type !== null ? type : undefined,
          status: status !== null ? status : undefined,
          source: source !== null ? source : undefined,
        }
      })

      const totalPages = Math.ceil(totalItems / limit)
      const hasNext = page < totalPages
      const hasPrev = page > 1

      this.response.sendSuccess(res, StatusCodes.OK, {
        data: {
          txHistories: removeNullFields(txHistories),
          metadata: {
            hasNext,
            hasPrev,
            totalItems,
            totalPages,
            currentPage: page,
            fetchedLength: txHistories.length,
          }
        },
      })
    } catch (err) {
      this.misc.handleServerError(res, err, "Error fetching Transaction Histories")
    }
  }

  async txAggregate(
    res: Response,
    { sub: userId }: ExpressUser,
    {
      endDate = '', startDate = '',
      source = null, type = null, status = null,
    }: TxAggregateDTO,
  ) {
    try {
      const tx = await this.prisma.transactionHistory.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate !== '' ? new Date(startDate) : new Date(0),
            lte: endDate !== '' ? new Date(endDate) : new Date(),
          },
          type: type !== null ? type : undefined,
          status: status !== null ? status : undefined,
          source: source !== null ? source : undefined,
        },
      })

      const moneyIn = await Promise.all(tx
        .filter(tx => tx.type === 'DEPOSIT' && tx.settlementAmount)
        .map(tx => {
          if (tx?.channel === 'internal') {
            if (tx?.inward_source === 'NGN') {
              return tx.settlementAmount
            } else {
              return tx.settlementAmount * tx.dollarRate
            }
          } else {
            return tx?.settlementAmount ?? 0
          }
        }))
        .then(amounts => amounts.reduce((sum, amount) => sum + amount, 0))
        .catch(error => {
          throw error
        })

      const moneyOut = await Promise.all(tx
        .filter(tx => tx.type === 'DISBURSEMENT' && tx.settlementAmount)
        .map(tx => {
          if (tx?.channel === 'internal') {
            if (tx?.outward_source === 'NGN') {
              return tx.settlementAmount
            } else {
              return tx.settlementAmount * tx.dollarRate
            }
          } else {
            return tx?.settlementAmount ?? 0
          }
        }))
        .then(amounts => amounts.reduce((sum, amount) => sum + amount, 0))
        .catch(error => {
          throw error
        })

      this.response.sendSuccess(res, StatusCodes.OK, {
        data: { moneyIn, moneyOut },
      })
    } catch (err) {
      this.misc.handleServerError(res, err, "Error calculating Money In & Out")
    }
  }

  async fetchTransactionHistory(
    res: Response,
    { sub: userId }: ExpressUser,
    { ref, idempotencyKey }: TxHistoryDto
  ) {
    try {
      if (!ref && !idempotencyKey) {
        return this.response.sendError(res, StatusCodes.BadRequest, "Either reference or idempotemcy key is required")
      }

      const where = idempotencyKey
        ? { idempotencyKey, userId }
        : ref
          ? { ref, userId }
          : { ref, idempotencyKey, userId }

      const txHistory = await this.prisma.transactionHistory.findUnique({ where })

      if (!txHistory) {
        this.response.sendError(res, StatusCodes.NotFound, "Transaction history could not be found")
        return
      }

      this.response.sendSuccess(res, StatusCodes.OK, { data: removeNullFields(txHistory) })
    } catch (err) {
      console.error(err)
      this.response.sendError(res, StatusCodes.InternalServerError, "Error fetching Transaction History")
    }
  }

  async fetchNotifications(res: Response, { sub: userId }: ExpressUser) {
    try {
      const currentDate = new Date()
      const sevenDaysAgo = new Date(currentDate)
      sevenDaysAgo.setDate(currentDate.getDate() - 7)

      const notifications = await this.prisma.notification.findMany({
        where: {
          userId,
          notifiedAt: {
            gte: sevenDaysAgo,
            lte: currentDate,
          },
        },
        select: {
          id: true,
          title: true,
          reference: true,
          notifiedAt: true,
          description: true,
        },
        orderBy: { notifiedAt: 'desc' },
      })

      this.response.sendSuccess(res, StatusCodes.OK, { data: notifications })

      res.on('finish', async () => {
        const allUnreadNotifications = await this.prisma.notification.count({
          where: {
            userId,
            read: false,
          }
        })

        if (allUnreadNotifications > 0) {
          await this.markNotificationsAsRead(userId)
        }
      })
    } catch (err) {
      this.misc.handleServerError(res, err, "Error fetching Notifications")
    }
  }

  private async markNotificationsAsRead(userId: string) {
    try {
      await this.prisma.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
        },
      })
    } catch (err) {
      console.error(err)
    }
  }

  async fetchWalletAddresses(res: Response, user: ExpressUser) {
    try {
      const walletAddress = await this.prisma.walletAddress.findMany({
        where: {
          userId: user.sub,
        },
        select: {
          id: true,
          mode: true,
          chain: true,
          userId: true,
          assetId: true,
          address: true,
          network: true,
          assetType: true,
          addressType: true,
        }
      })

      const addresses = await Promise.all(walletAddress.map(async (addr) => {
        const assetType = addr.assetType
        const price = await this.prisma.prices.findFirst({
          where: { assetType },
        })

        return { ...addr, metadata: price }
      }))

      this.response.sendSuccess(res, StatusCodes.OK, { data: addresses })
    } catch (err) {
      this.misc.handleServerError(res, err, 'Error fetcing wallet addresses')
    }
  }

  async fetchWalletAddress(res: Response, { sub }: ExpressUser, address: string) {
    try {
      const wallet = await this.prisma.walletAddress.findFirst({
        where: {
          userId: sub,
          address: address,
        },
        select: {
          id: true,
          mode: true,
          chain: true,
          userId: true,
          assetId: true,
          address: true,
          network: true,
          assetType: true,
          addressType: true,
        }
      })
      const price = await this.prisma.prices.findFirst({
        where: {
          assetType: wallet.assetType
        },
      })

      if (price) {
        this.response.sendSuccess(res, StatusCodes.OK, { data: { ...wallet, ...price } })
      } else {
        this.response.sendSuccess(res, StatusCodes.OK, { data: wallet })
      }
    } catch (err) {
      this.misc.handleServerError(res, err, "Failed to retrieve wallet address")
    }
  }

  async fetchRecipients(
    res: Response,
    { sub: userId }: ExpressUser,
    {
      page = 1, limit = 20, search = ''
    }: RecipientDto
  ) {
    try {
      search = search?.trim() ?? ''
      limit = Number(limit)
      const offset = (Number(page) - 1) * limit

      const where: {
        userId: string
        recipient_type: "in_app"
        OR: ({
          username: {
            contains: string
            mode: "insensitive"
          }
        } | {
          fullname: {
            contains: string
            mode: "insensitive"
          }
        } | {
          user: {
            profile: {
              phone: {
                contains: string
                mode: "insensitive"
              }
            }
          }
        })[]
      } = {
        userId,
        recipient_type: 'in_app',
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { fullname: { contains: search, mode: 'insensitive' } },
          { user: { profile: { phone: { contains: search, mode: 'insensitive' } } } },
        ],
      }

      const recipients = await this.prisma.recipient.findMany({
        where,
        select: {
          id: true,
          userId: true,
          fullname: true,
          username: true,
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  phone: true,
                  avatar: true,
                }
              }
            }
          }
        },
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
      })

      const totalItems = await this.prisma.recipient.count({
        where
      })

      const totalPages = Math.ceil(totalItems / limit)
      const hasNext = page < totalPages
      const hasPrev = page > 1

      this.response.sendSuccess(res, StatusCodes.OK, {
        data: {
          recipients,
          metadata: {
            totalItems,
            totalPages,
            currentPage: page,
            hasNext,
            hasPrev,
            fetchedLength: recipients.length,
          }
        },
      })
    } catch (err) {
      this.misc.handleServerError(res, err, 'Error fetching recipients')
    }
  }

  async fetchTiers(res: Response, { sub }: ExpressUser) {
    const currentLevel = await this.prisma.level.findFirst({
      where: {
        users: {
          some: {
            id: sub
          }
        }
      },
      include: {
        constraints: true
      }
    })

    const levels = await this.prisma.level.findMany({
      include: {
        constraints: true
      }
    })

    this.response.sendSuccess(res, StatusCodes.OK, { data: { currentLevel, levels } })
  }
}