import { Request, Response } from 'express'
import { MiscService } from 'lib/misc.service'
import { StatusCodes } from 'enums/statusCodes'
import { getIpAddress } from 'helpers/getIPAddress'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { BitPowrSdkService } from 'lib/bitPowr.service'
import { HttpException, Injectable } from '@nestjs/common'
import { TransferStatus, TransactionType, TransactionHistory } from '@prisma/client'

@Injectable()
export class WebhooksService {
  private bitPowerSdk: any
  private processing = false
  private requestQueue: Request[] = []

  constructor(
    private readonly misc: MiscService,
    private readonly prisma: PrismaService,
    private readonly response: ResponseService,
  ) {
    this.bitPowerSdk = new BitPowrSdkService().getSdk()
  }

  async manageCryptoEvents(res: Response, req: Request) {
    const { body } = req

    switch (body.event) {
      case 'transaction.incoming':
        this.response.sendSuccess(res, StatusCodes.OK, { message: 'New Transaction' })
        break

      case 'transaction.deposit.created':
        this.enqueueRequest(req)
        this.response.sendSuccess(res, StatusCodes.OK, { message: 'Successful Deposit' })
        break

      default:
        break
    }

    this.processQueue()
  }

  async manageFiatEvents(req: Request) {
    await this.enqueueRequest(req)
    await this.processQueue()
  }

  private async enqueueRequest(req: Request) {
    this.requestQueue.push(req)
  }

  private async processQueue() {
    if (!this.processing) {
      this.processing = true

      while (this.requestQueue.length > 0) {
        const req = this.requestQueue.shift()
        await this.handleEvent(req)
      }

      this.processing = false
    }
  }

  private async handleEvent(req: Request) {
    const { body } = req

    switch (body.event as EventType) {
      case 'transaction.incoming':
      case 'transaction.deposit.created':
        await Promise.all([
          this.handleIncomingCryptoDepositEvent(req),
          this.handleCryptoDepositEvent(req)
        ])
        break

      case 'transfer.success':
      case 'transfer.failed':
      case 'transfer.reversed':
        await this.handleFiatTransferEvent(req)
        break

      default:
        break
    }
  }

  private async handleFiatTransferEvent(req: Request) {
    const body = req.body as TransferEvent
    const data = body.data

    try {
      const transaction = await this.getTransaction(data.reference)

      if (transaction) {
        await this.updateTransactionStatus(transaction, data.status.toUpperCase() as TransferStatus)

        const amount = this.calculateTotalAmount(data.amount, transaction.totalFee)

        await this.handleEventNotifications(body.event, transaction, amount)

        if (body.event === 'transfer.reversed' || body.event === 'transfer.failed') {
          await this.updateUserBalance(transaction.userId, amount)
        }
      }
    } catch (err) {
      this.handleTransactionError(err)
    }
  }

  private async getTransaction(ref: string) {
    return await this.prisma.transactionHistory.findUnique({
      where: { ref },
    })
  }

  private async updateTransactionStatus(transaction: TransactionHistory, status: TransferStatus) {
    await this.prisma.transactionHistory.update({
      where: {
        ref: transaction.ref
      },
      data: { status },
    })
  }

  private calculateTotalAmount(amount: number, totalFee: number) {
    const KOBO = 100 as const
    return (amount / KOBO) + totalFee
  }

  private async isNotifiedTwice(reference: string) {
    const notification = await this.prisma.notification.findMany({
      where: { reference }
    })

    return notification.length >= 2 ? true : false
  }

  private async handleEventNotifications(event: FiatEvents, transaction: TransactionHistory, amount: number) {
    const notified = await this.isNotifiedTwice(transaction.ref)
    if (!notified) {
      switch (event) {
        case 'transfer.success':
          await this.addNotification(
            "Transfer Successful",
            `Your transfer to '${transaction.destinationAccountName} (${transaction.destinationAccountNumber})' was successful. ₦${transaction.amount}`,
            transaction.userId, transaction.ref,
          )
          // TODO: Mail and App notification for successful transaction
          break
        case 'transfer.failed':
          await this.addNotification(
            "Transfer Failed",
            `A total of ₦${amount} has been reversed to your account.`,
            transaction.userId, transaction.ref,
          )
          // TODO: Mail and App notification for failed transaction
          break
        case 'transfer.reversed':
          await this.addNotification(
            "Transfer Reversed",
            `A total of ₦${amount} has been reversed to your account.`,
            transaction.userId, transaction.ref,
          )
          // TODO: Mail and App notification for reversed transaction
          break
        default:
          break
      }
    }
  }

  private async updateUserBalance(userId: string, amount: number) {
    await this.prisma.wallet.update({
      where: { userId },
      data: {
        ngnBalance: {
          increment: amount
        }
      },
    })
  }

  private async handleIncomingCryptoDepositEvent(req: Request) {
    let data = req.body.data as TransactionHistory

    const { user: { id, profile: { deviceToken } } } = await this.prisma.walletAddress.findFirst({
      where: {
        address: data.address
      },
      select: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                deviceToken: true
              }
            }
          }
        }
      }
    })

    const isNotified = await this.prisma.notification.findUnique({
      where: {
        hash: data.hash
      }
    })

    if (!isNotified) {
      await this.prisma.notification.create({
        data: {
          title: "Incoming Crypto Transaction",
          description: `${Number(data.amount).toFixed(3)} ${data.assetType} (${data.chain}) was sent from ${data.senderAddress.slice(0, 9)}...`,
          hash: data.hash,
          user: {
            connect: { id }
          }
        }
      })
    }

    // TODO: App notification - about an incoming transaction
  }

  private async handleCryptoDepositEvent(req: Request) {
    let data = req.body.data as TransactionHistory

    const { data: reverifyData } = await this.bitPowerSdk.gettransaction({
      transaction_id: data.ref
    })

    if (reverifyData.status === 'success') {
      const transaction = reverifyData.data[0]
      data = { ...data, ...transaction }

      try {
        const existingTransaction = await this.prisma.transactionHistory.findUnique({
          where: {
            idempotencyKey: data.idempotencyKey,
          },
        })

        const assetType = data.assetType
        const price = await this.prisma.prices.findFirst({
          where: { assetType }
        })

        let currentPrice = price.currentPrice ?? 0

        if (!currentPrice) {
          currentPrice = price.ngn_current_price
        }

        const nairaAmount = currentPrice * data.amount
        data.nairaAmount = nairaAmount

        if (existingTransaction) {
          await this.updateCryptoDepositTransactionHistory(data)
        } else {
          await this.addCryptoDepositTransactionHistory(req, data)
        }

        if ((existingTransaction && existingTransaction.status === 'PENDING' && data.status === 'SUCCESS') || (!existingTransaction && data.status === 'SUCCESS')) {
          const ref = `crypto-transfer-${data.label}-${data.idempotencyKey}`
          const history = await this.getTransaction(ref)

          if (!history) {
            const fee = await this.misc.calculateCryptoFiatFee(nairaAmount)
            data.totalFee = fee.totalFee
            data.processingFee = fee.processingFee
            data.settlementAmount = nairaAmount - fee.totalFee

            await this.updateUserBalance(data.label, data.settlementAmount)
            await this.addCryptoFiatDepositTransactionHistory(req, data)
            await this.addNotification(
              "Account Credited Successfully",
              `Your coin has been automatically converted to cash. ₦${fee.totalFee.toFixed(2)} was charged for the fee. ₦${data.settlementAmount.toFixed(2)} was added to your balance.`,
              data.label,
              ref
            )
            // TODO: App notification - about a successful transaction
          }
        }
      } catch (err) {
        this.handleTransactionError(err)
      }
    }
  }

  private async addCryptoDepositTransactionHistory(req: Request, data: TransactionHistory) {
    await this.prisma.transactionHistory.create({
      data: {
        source: 'crypto',
        ref: data.ref,
        ip: getIpAddress(req),
        dollarRate: data.dollarRate,
        nairaAmount: data.nairaAmount,
        dollarAmount: data.dollarAmount,
        status: data.status as TransferStatus,
        type: data.type as TransactionType,
        label: data.label,
        address: data.address,
        assetId: data.assetId,
        assetType: data.assetType,
        amount: Number(data.amount),
        hash: data.hash,
        blockHash: data.blockHash,
        timestamp: data.timestamp,
        senderAddress: data.senderAddress,
        idempotencyKey: data.idempotencyKey,
        broadcastedAt: new Date(data.broadcastedAt),
        chain: data.chain,
        confirmation: data.confirmation,
        blockHeight: data.blockHeight,
        description: data?.description,
        user: {
          connect: {
            id: data.label
          }
        }
      }
    })
  }

  private async addCryptoFiatDepositTransactionHistory(req: Request, data: TransactionHistory) {
    await this.prisma.transactionHistory.create({
      data: {
        source: 'fiat',
        type: 'DEPOSIT',
        status: 'COMPLETED',
        ip: getIpAddress(req),
        amount: data.nairaAmount,
        settlementAmount: data.settlementAmount,
        ref: `crypto-transfer-${data.label}-${data.idempotencyKey}`,
        totalFee: data.totalFee,
        processingFee: data.processingFee,
        assetType: data.assetType,
        senderAddress: data.senderAddress,
        address: data.address,
        currency: 'NGN',
        description: 'Credit - from Quidate',
        user: {
          connect: {
            id: data.label
          }
        }
      }
    })
  }

  private async updateCryptoDepositTransactionHistory(data: TransactionHistory) {
    await this.prisma.transactionHistory.update({
      where: {
        idempotencyKey: data.idempotencyKey
      },
      data: {
        status: data.status
      }
    })
  }

  private async handleTransactionError(err: any) {
    console.error(err)
    throw new HttpException('Something went wrong', StatusCodes.InternalServerError)
  }

  private async addNotification(title: string, description: string, id: string, reference?: string) {
    await this.prisma.notification.create({
      data: { title, description, reference, user: { connect: { id } } }
    })
  }
}