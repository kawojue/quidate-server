import { Request, Response } from 'express'
import { Injectable } from '@nestjs/common'
import { MiscService } from 'lib/misc.service'
import { StatusCodes } from 'enums/StatusCodes'
import { FundWalletDTO } from './dto/deposit.dto'
import { genRandomCode } from 'helpers/generator'
import { getIpAddress } from 'helpers/getIPAddress'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { BitPowrSdkService } from 'lib/bitPowr.service'
import { EncryptionService } from 'lib/encryption.service'
import { PriceConversionService } from 'lib/price-conversion'
import { toLowerCase, toUpperCase } from 'helpers/transformer'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { BankDetailsDTO, ValidateBankDTO } from './dto/bank.dto'
import {
  AmountDTO, GetReceiverDTO, InitiateLocalTransferDTO, TxSourceDTO
} from './dto/tx.dto'
import {
  TransactionCurrency, TransactionSource, TransactionType, TransferStatus
} from '@prisma/client'

@Injectable()
export class WalletService {
  private bitPowerSdk: any

  constructor(
    private readonly misc: MiscService,
    private readonly prisma: PrismaService,
    private readonly response: ResponseService,
    private readonly paystack: PaystackService,
    private readonly encryption: EncryptionService,
    private readonly conversion: PriceConversionService,
  ) {
    this.bitPowerSdk = new BitPowrSdkService().getSdk()
  }

  async bankAccountVerification(res: Response, { account_number, bank_code }: ValidateBankDTO) {
    const { data } = await this.paystack.resolveAccount(account_number, bank_code)

    this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  async fetchBanks(res: Response) {
    const { data: banks } = await this.paystack.listBanks()

    this.response.sendSuccess(res, StatusCodes.OK, { data: banks })
  }

  async fetchBankByBankCode(res: Response, bankCode: string) {
    const bank = await this.paystack.getBankByBankCode(bankCode)

    if (!bank) {
      this.response.sendError(res, StatusCodes.NotFound, "No supported Bank Name is associated with this bank code.")
      return
    }

    this.response.sendSuccess(res, StatusCodes.OK, { data: bank })
  }

  async initiateLocalTransfer(
    req: Request,
    res: Response,
    receiverId: string,
    { tx_source }: TxSourceDTO,
    {
      narration, amount,
      pin, biometricToken,
    }: InitiateLocalTransferDTO
  ) {
    try {
      // @ts-ignore
      const userId = req.user?.sub
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      })
      const wallet = await this.prisma.getUserWallet(userId)
      const profile = await this.prisma.getProfile(userId)

      if (!biometricToken && !pin) {
        return this.response.sendError(res, StatusCodes.BadRequest, 'PIN or Biometric is required')
      }

      const MIN_AMOUNT = tx_source === 'NGN' ? 25 : 1
      if (amount < MIN_AMOUNT) {
        return this.response.sendError(res, StatusCodes.BadRequest, `Minimum amount is ${tx_source === 'NGN' ? '₦25.00' : '$1.00'}`)
      }

      const balance = tx_source === 'NGN' ? wallet.ngnBalance : wallet.usdBalance
      if (amount > balance) {
        this.response.sendError(res, StatusCodes.UnprocessableEntity, "Insufficient balance")
        return
      }

      const receiver = await this.prisma.user.findUnique({
        where: { id: receiverId },
        include: {
          wallet: true
        }
      })

      if (!receiver) {
        return this.response.sendError(res, StatusCodes.NotFound, "Receiver's account not found")
      }

      if (user.id === receiver.id) {
        return this.response.sendError(res, StatusCodes.Conflict, "Sender and Receiver's accounts have the same references")
      }

      if (!profile.pin) {
        return this.response.sendError(res, StatusCodes.BadRequest, "Create a transaction PIN")
      }

      if (pin) {
        const pinTrialsKey = `pinTrials:${user.id}`
        const pinTrials = await this.prisma.cache.findUnique({
          where: {
            key: pinTrialsKey
          },
        })

        let maxPinTrials = 5
        let resetInterval = 1_800_000
        const currentTime = Date.now()

        if (pinTrials && pinTrials.value >= maxPinTrials && currentTime - pinTrials.createdAt.getTime() < resetInterval) {
          this.response.sendError(res, StatusCodes.Unauthorized, "Maximum PIN trials exceeded")

          maxPinTrials = 3
          resetInterval += 3_600_000
          await this.prisma.cache.update({
            where: {
              key: pinTrialsKey
            },
            data: {
              createdAt: new Date(currentTime),
            },
          })

          return
        }

        const isMatch = await this.encryption.compare(pin, profile.pin)
        if (!isMatch) {
          const cache = await this.prisma.cache.upsert({
            where: {
              key: pinTrialsKey
            },
            create: {
              key: pinTrialsKey,
              value: 1,
              createdAt: new Date(currentTime),
            },
            update: {
              value: {
                increment: 1
              },
              createdAt: new Date(currentTime),
            },
          })

          this.response.sendError(res, StatusCodes.Unauthorized, `Invalid PIN. ${maxPinTrials - cache.value} trial(s) left`)
          return
        }

        if (pinTrials) {
          await this.prisma.cache.delete({
            where: {
              key: pinTrialsKey
            },
          })
        }
      }

      if (biometricToken) {
        const decodedToken = await this.misc.validateAndDecodeToken(biometricToken)
        const sub = decodedToken?.sub

        if (userId !== sub) {
          return this.response.sendError(res, StatusCodes.Unauthorized, 'Invalid Biometric Token received')
        }

        const checkings = await this.prisma.biometricCheck(userId, 'Tx')
        if (!checkings.isAbleToUseBiometric) {
          return this.response.sendError(res, StatusCodes.Unauthorized, checkings.reason)
        }
      }

      const ip = getIpAddress(req)
      const randomCode = genRandomCode()
      const ref = `transfer-${user.id}-${randomCode}`
      const currentDate = new Date()
      const transfer_code = `${receiver.id}-${user.id}-${randomCode}`

      const senderHistory = {
        ip,
        ref,
        amount,
        narration,
        totalFee: 0,
        channel: 'internal',
        settlementAmount: amount,
        outward_source: tx_source,
        broadcastedAt: currentDate,
        transferCode: transfer_code,
        source: 'fiat' as TransactionSource,
        status: 'SUCCESS' as TransferStatus,
        type: 'DISBURSEMENT' as TransactionType,
        sourceAccountName: user.fullName,
        destinationAccountName: receiver.fullName,
        currency: tx_source === 'NGN' ? 'NGN' : 'USD' as TransactionCurrency,
      }

      if (tx_source === 'NGN') {
        await Promise.all([
          this.prisma.manageBalance(user.id, 'ngnBalance', amount, 'decrement'),
          this.prisma.manageBalance(receiver.id, 'ngnBalance', amount, 'increment')
        ])
      } else {
        await Promise.all([
          this.prisma.manageBalance(user.id, 'usdBalance', amount, 'decrement'),
          this.prisma.manageBalance(receiver.id, 'usdBalance', amount, 'increment')
        ])
      }

      await this.prisma.$transaction([
        this.prisma.recipient.upsert({
          where: { userId, username: receiver.username },
          create: {
            updatedAt: new Date(),
            createdAt: currentDate,
            fullname: receiver.fullName,
            username: receiver.username,
            user: { connect: { id: user.id } }
          },
          update: { updatedAt: new Date() }
        }),
        this.prisma.transactionHistory.create({
          data: {
            ...senderHistory,
            user: { connect: { id: user.id } }
          }
        }),
      ])

      res.on('finish', async () => {
        await this.prisma.$transaction([
          this.prisma.transactionHistory.create({
            data: {
              ip,
              ref,
              amount,
              totalFee: 0,
              source: 'fiat',
              type: 'DEPOSIT',
              status: 'COMPLETED',
              channel: 'internal',
              inward_source: tx_source,
              settlementAmount: amount,
              sourceAccountName: user.fullName,
              destinationAccountName: receiver.fullName,
              narration: narration || `Quidate - ${user.username}`,
              currency: tx_source === 'NGN' ? 'NGN' : 'USD' as TransactionCurrency,
              user: { connect: { id: receiver.id } }
            }
          }),
          this.prisma.notification.create({
            data: {
              title: 'Account Credited Successfully',
              reference: ref,
              description: `Quidate user '${user.fullName} (${user.username})' has sent you ${tx_source === 'NGN' ? `₦${amount}` : `$${amount}`}`,
              user: { connect: { id: receiver.id } }
            }
          })
        ])
      })

      // TODO: mailing and app notification

      this.response.sendSuccess(res, StatusCodes.OK, {
        data: { reference: ref },
        message: "Transaction was successful"
      })
    } catch (err) {
      this.misc.handleServerError(res, err, "Error initiating transaction")
    }
  }

  async getReceiver(res: Response, { phoneOrUsername }: GetReceiverDTO) {
    try {
      const identifier = toLowerCase(phoneOrUsername)

      const userByUsername = await this.prisma.user.findUnique({
        where: { username: identifier },
        select: {
          id: true,
          username: true,
          fullName: true,
          profile: {
            select: { avatar: true, }
          }
        },
      })

      let userByPhone: {
        id: string
        fullName: string
        profile: {
          phone: string
          avatar: {
            idx: string
            public_id: string
            public_url: string
            secure_url: string
          }
        }
      } | null = null

      if (identifier.length >= 10) {
        userByPhone = await this.prisma.user.findFirst({
          where: {
            profile: {
              phone: {
                contains: identifier,
                mode: 'insensitive',
              },
            },
          },
          select: {
            id: true,
            fullName: true,
            profile: {
              select: {
                phone: true,
                avatar: true,
              }
            }
          },
        })
      }

      const user = userByUsername || userByPhone

      if (!user) {
        return res.status(StatusCodes.NotFound).json({ message: "Receiver not found" })
      }
    } catch (err) {
      this.misc.handleServerError(res, err, "Error fetching receiver")
    }
  }

  async sendInternalNGNTOUSD(
    res: Response,
    { sub }: ExpressUser,
    { amount }: AmountDTO,
  ) {
    try {
      if (0 >= amount) {
        return this.response.sendError(res, StatusCodes.BadRequest, 'Invalid amount')
      }

      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: sub }
      })

      amount = Number(amount)
      if (amount > wallet.ngnBalance) {
        return this.response.sendError(res, StatusCodes.UnprocessableEntity, 'Insufficient NGN Balance')
      }

      const { price: dollarAmount, rate } = await this.conversion.convert_currency(amount, 'NGN_TO_USD')

      const [hist] = await this.prisma.$transaction([
        this.prisma.transactionHistory.create({
          data: {
            amount,
            dollarAmount,
            dollarRate: rate,
            currency: "USD",
            ref: `conversion-${sub}-${genRandomCode()}`,
            status: 'COMPLETED',
            source: 'fiat',
            channel: 'internal',
            type: 'CONVERSION',
            user: {
              connect: {
                id: sub
              }
            }
          }
        }),
        this.prisma.wallet.update({
          where: {
            userId: sub
          },
          data: {
            usdBalance: {
              increment: dollarAmount
            },
            ngnBalance: {
              decrement: amount
            }
          }
        }),
      ])

      res.on('finish', async () => {
        await this.prisma.notification.create({
          data: {
            title: 'Conversion - NGN to USD',
            description: `You've successfully converted ₦${amount.toFixed(2)} to $${dollarAmount.toFixed(2)}. Zero fee`,
            reference: hist.ref,
            user: {
              connect: {
                id: sub
              }
            }
          }
        })
      })

      this.response.sendSuccess(res, StatusCodes.OK, {
        message: `You converted ₦${amount} to $${dollarAmount}. Zero fee`
      })
    } catch (err) {
      this.misc.handleServerError(res, err, 'Error converting NGN to USD')
    }
  }

  async withDrawInternalUSDTONGN(
    res: Response,
    { sub }: ExpressUser,
    amount: number
  ) {
    try {
      if (0 >= amount) {
        return this.response.sendError(res, StatusCodes.BadRequest, 'Invalid amount')
      }

      const wallet = await this.prisma.wallet.findUnique({
        where: {
          userId: sub
        }
      })

      amount = Number(amount)
      if (amount > wallet.usdBalance) {
        this.response.sendError(res, StatusCodes.UnprocessableEntity, 'Insufficient USD Balance')
        return
      }

      const fee = this.misc.calculateUSDFee(amount)
      const dollarAmount = amount - fee
      const { price: ngnAmount, rate } = await this.conversion.convert_currency(dollarAmount, 'USD_TO_NGN')

      const [hist] = await this.prisma.$transaction([
        this.prisma.transactionHistory.create({
          data: {
            amount: ngnAmount,
            currency: "NGN",
            dollarAmount: amount,
            ref: `conversion-${sub}-${genRandomCode()}`,
            status: 'COMPLETED',
            source: 'fiat',
            type: 'CONVERSION',
            channel: 'internal',
            dollarRate: rate,
            user: {
              connect: {
                id: sub
              }
            }
          }
        }),
        this.prisma.wallet.update({
          where: {
            userId: sub
          },
          data: {
            usdBalance: {
              decrement: amount
            },
            ngnBalance: {
              increment: ngnAmount
            }
          }
        })
      ])

      res.on('finish', async () => {
        await this.prisma.notification.create({
          data: {
            title: 'Conversion - USD to NGN',
            description: `You converted $${amount.toFixed(2)} to ₦${ngnAmount.toFixed(2)}. $${fee.toFixed(2)} was charged.`,
            reference: hist.ref,
            user: {
              connect: {
                id: sub
              }
            }
          }
        })
      })

      this.response.sendSuccess(res, StatusCodes.OK, {
        message: `You've successfully converted $${amount} to ₦${ngnAmount}. $${fee} was charged.`
      })
    } catch (err) {
      this.misc.handleServerError(res, err, 'Error converting USD to NGN')
    }
  }

  async fundWallet(
    res: Response,
    { sub }: ExpressUser,
    { ref }: FundWalletDTO,
  ) {
    try {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId: sub } })

      if (!wallet) {
        return this.response.sendError(res, StatusCodes.NotFound, 'Wallet not found')
      }

      const verifyTx = await this.paystack.verifyTransaction(ref)
      if (!verifyTx.status || verifyTx?.data?.status !== "success") {
        return this.response.sendError(res, StatusCodes.PaymentIsRequired, 'Payment is required')
      }

      const { data } = verifyTx
      const amountPaid = data.amount / 100
      const channel = data?.authorization?.channel
      const authorization_code = data?.authorization?.authorization_code

      const [_, tx] = await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId: sub },
          data: {
            lastDepoistedAt: new Date(),
            lastAmountDeposited: amountPaid,
            ngnBalance: { increment: amountPaid }
          }
        }),
        this.prisma.transactionHistory.create({
          data: {
            channel,
            type: 'DEPOSIT',
            source: 'fiat',
            amount: amountPaid,
            authorization_code,
            ip: data.ip_address,
            ref: `deposit-${ref}}`,
            user: { connect: { id: sub } },
            broadcastedAt: new Date(data.transaction_date),
            status: toUpperCase(data.status) as TransferStatus,
            currency: toUpperCase(data.currency) as CurrencyCode,
          }
        })
      ])

      this.response.sendSuccess(res, StatusCodes.OK, { data: tx })
    } catch (err) {
      this.misc.handlePaystackAndServerError(res, err)
    }
  }

  async linkBankAccount(
    res: Response,
    { sub }: ExpressUser,
    { accountNumber, bankCode }: BankDetailsDTO
  ) {
    try {
      const linkedAccounts = await this.prisma.linkedBank.findMany({
        where: { userId: sub },
        orderBy: { createdAt: 'desc' },
      })

      const totalLinked = linkedAccounts.length
      let canLinkNewAccount = true
      let replaceAccountId = null

      if (totalLinked === 2) {
        const lastLinkedBankAccount = linkedAccounts[0]

        const now = new Date().getTime()
        const lastLinkedDate = new Date(lastLinkedBankAccount.createdAt).getTime()
        const diffTime = Math.abs(now - lastLinkedDate)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (lastLinkedBankAccount.primary) {
          canLinkNewAccount = true
        } else if (diffDays < 90) {
          canLinkNewAccount = false
          return this.response.sendError(res, StatusCodes.BadRequest, "You cannot link a new bank account until 90 days have passed since the last account was linked.")
        } else {
          replaceAccountId = lastLinkedBankAccount.id
        }
      }

      if (canLinkNewAccount) {
        const bank = await this.paystack.getBankByBankCode(bankCode)
        const { data: details } = await this.paystack.resolveAccount(accountNumber, bankCode)

        if (totalLinked === 0) {
          const user = await this.prisma.user.findUnique({
            where: { id: sub },
            select: { id: true, fullName: true },
          })

          let matchingNamesCount = 0

          const full_names = toUpperCase(user.fullName).split(/[\s,]+/).filter(Boolean)
          const account_names = toUpperCase(details.account_name).split(/[\s,]+/).filter(Boolean)

          for (const account_name of account_names) {
            if (full_names.includes(account_name)) {
              matchingNamesCount += 1
            }
          }

          if (matchingNamesCount < 2) {
            return this.response.sendError(res, StatusCodes.BadRequest, "Account names do not match.")
          }
        }

        const data = replaceAccountId
          ? await this.prisma.linkedBank.update({
            where: { id: replaceAccountId },
            data: {
              bankCode,
              accountNumber,
              bankName: bank.name,
              primary: totalLinked === 0,
              accountName: details.account_name,
            },
          })
          : await this.prisma.linkedBank.create({
            data: {
              bankCode,
              accountNumber,
              bankName: bank.name,
              primary: totalLinked === 0,
              accountName: details.account_name,
              user: { connect: { id: sub } },
            },
          })

        this.response.sendSuccess(res, StatusCodes.Created, {
          data,
          message: replaceAccountId ? "Your bank account has been updated." : "Your bank account has been linked.",
        })
      }
    } catch (err) {
      this.misc.handlePaystackAndServerError(res, err)
    }
  }

  async linkedBanks(res: Response, { sub }: ExpressUser) {
    const banks = await this.prisma.linkedBank.findMany({
      where: { userId: sub },
      orderBy: [
        { primary: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    this.response.sendSuccess(res, StatusCodes.OK, { data: banks })
  }

  async getLinkedBank(
    id: string,
    res: Response,
    { sub: userId }: ExpressUser,
  ) {
    const bank = await this.prisma.linkedBank.findUnique({
      where: { id, userId }
    })

    if (!bank) {
      return this.response.sendError(res, StatusCodes.NotFound, "Linked bank account not found")
    }

    this.response.sendSuccess(res, StatusCodes.OK, { data: bank })
  }

  async assignAddresses(res: Response, { sub: userId }: ExpressUser) {
    try {
      const walletAddressesCount = await this.prisma.walletAddress.count({
        where: { userId }
      })

      const linkedBanksCount = await this.prisma.linkedBank.count({
        where: { userId }
      })

      if (linkedBanksCount > 0) {
        return this.response.sendError(res, StatusCodes.NotFound, "Link a primary bank account before assigning addresses")
      }

      if (walletAddressesCount > 0) {
        return this.response.sendError(res, StatusCodes.Conflict, "You have existing wallet addresses")
      }

      let createdAddresses: {
        mode: string
        chain: string
        address: string
        network: string
        assetType: string
        addressType: string
      }[] = []

      const walletAccount = await this.prisma.walletAccount.findFirst({
        where: {
          isActive: true,
        },
        include: {
          assets: true,
        }
      })

      if (!walletAccount) {
        return this.response.sendError(res, StatusCodes.NotFound, "There are no accounts at the moment to create wallet from")
      }

      for (const asset of walletAccount.assets) {
        const { data: { data: address } } = await this.bitPowerSdk.createaddresses({
          label: userId,
          asset: asset.assetType,
          accountId: walletAccount.uid,
        })

        const createdAddressesData = {
          mode: address.mode,
          chain: address.chain,
          address: address.address,
          network: address.network,
          assetType: address.assetType,
          addressType: address.addressType,
        }

        await this.prisma.walletAddress.create({
          data: {
            uid: address.uid,
            guid: address.guid,
            ...createdAddressesData,
            addressRef: address.addressRef,
            isContract: address.isContract,
            isChangeAddress: address.isChangeAddress,
            derivationIndex: address.derivationIndex,
            label: address.label,
            assetId: address.assetId,
            organizationId: address.organizationId,
            accountId: address.accountId,
            subAccountId: address.subAccountId,
            used: address.used,
            addressContractIdentifier: address.addressContractIdentifier,
            deploymentParams: address.deploymentParams,
            lastUsedAt: address.lastUsedAt,
            user: { connect: { id: userId } }
          }
        })
        createdAddresses.push(createdAddressesData)
      }

      await this.prisma.notification.create({
        data: {
          title: 'Crypto Address - Start Making Transaction',
          description: "Addresses have been assigned to your account. Start converting your crypto to cash.",
          user: {
            connect: {
              id: userId
            }
          }
        }
      })

      this.response.sendSuccess(res, StatusCodes.Created, {
        data: createdAddresses,
        message: "Addresses have been assigned successfully"
      })
    } catch (err) {
      // TODO: mail admin about the error
      this.misc.handleServerError(res, err, "An error occured on our end")
    }
  }

  async findMainWallets(res: Response) {
    try {
      const data = await this.bitPowerSdk.getaccount()
      console.log({ frombitpower: data.data.data })

      const walletData = data.data.data

      let walletAccount
      let walletAccountAssets

      let seedMainWallet = []

      for (const wallet of walletData) {
        walletAccount = await this.prisma.walletAccount.findUnique({
          where: {
            uid: wallet.uid
          },
          include: {
            assets: true
          }
        })

        if (walletAccount) {
          walletAccountAssets = walletAccount.assets
          walletAccount = await this.prisma.walletAccount.update({
            where: { id: walletAccount.id },
            data: {
              externalId: wallet.externalId,
              fiatCurrency: wallet.fiatCurrency,
              name: wallet.name,
              type: wallet.type,
              showInDashboard: wallet.showInDashboard,
              isDeleted: wallet.isDeleted,
              isArchived: wallet.isArchived,
              organizationId: wallet.organizationId,
              network: wallet.network,
              createdAt: new Date(wallet.createdAt),
              mode: wallet.mode,
              maxDailyAmount: wallet.maxDailyAmount,
              maxMonthlyAmount: wallet.maxMonthlyAmount,
              maxDailyTransactionsCount: wallet.maxDailyTransactionsCount,
              maxMonthlyTransactionsCount: wallet.maxMonthlyTransactionsCount,
              whiteListAddresses: wallet.whiteListAddresses,
              received: wallet.fiatBalance.received,
              sent: wallet.fiatBalance.sent,
              balance: wallet.fiatBalance.balance,
              pending: wallet.fiatBalance.pending,
              blocked: wallet.fiatBalance.blocked
            },
          })

          for (const asset of wallet.asset) {
            const existingAsset = walletAccountAssets.find(a => a.uid === asset.uid)
            if (existingAsset) {
              await this.prisma.asset.update({
                where: { id: existingAsset.id },
                data: {
                  guid: asset.guid,
                  label: asset.label,
                  isDeleted: asset.isDeleted,
                  isArchived: asset.isArchived,
                  isContract: asset.isContract,
                  chain: asset.chain,
                  network: asset.network,
                  mode: asset.mode,
                  assetType: asset.assetType,
                  autoForwardAddress: asset.autoForwardAddress,
                  received: asset.balance.received,
                  sent: asset.balance.sent,
                  balance: asset.balance.balance,
                  pending: asset.balance.pending,
                  blocked: asset.balance.blocked,
                  createdAt: asset.createdAt
                },
              })
            } else {
              await this.prisma.asset.create({
                data: {
                  uid: asset.uid,
                  guid: asset.guid,
                  label: asset.label,
                  isDeleted: asset.isDeleted,
                  isArchived: asset.isArchived,
                  isContract: asset.isContract,
                  chain: asset.chain,
                  network: asset.network,
                  mode: asset.mode,
                  assetType: asset.assetType,
                  autoForwardAddress: asset.autoForwardAddress,
                  received: asset.balance.received,
                  sent: asset.balance.sent,
                  balance: asset.balance.balance,
                  pending: asset.balance.pending,
                  blocked: asset.balance.blocked,
                  createdAt: asset.createdAt,
                  accountId: walletAccount.id
                },
              })
            }
          }
        } else {
          const assetData = wallet.asset.map((asset) => ({
            uid: asset.uid,
            guid: asset.guid,
            label: asset.label,
            isDeleted: asset.isDeleted,
            isArchived: asset.isArchived,
            isContract: asset.isContract,
            chain: asset.chain,
            network: asset.network,
            mode: asset.mode,
            assetType: asset.assetType,
            autoForwardAddress: asset.autoForwardAddress,
            received: asset.balance.received,
            sent: asset.balance.sent,
            balance: asset.balance.balance,
            pending: asset.balance.pending,
            blocked: asset.balance.blocked,
            createdAt: asset.createdAt,
          }))

          walletAccount = await this.prisma.walletAccount.create({
            data: {
              uid: wallet.uid,
              externalId: wallet.externalId,
              fiatCurrency: wallet.fiatCurrency,
              name: wallet.name,
              type: wallet.type,
              showInDashboard: wallet.showInDashboard,
              isDeleted: wallet.isDeleted,
              isArchived: wallet.isArchived,
              organizationId: wallet.organizationId,
              network: wallet.network,
              createdAt: new Date(wallet.createdAt),
              mode: wallet.mode,
              maxDailyAmount: wallet.maxDailyAmount,
              maxMonthlyAmount: wallet.maxMonthlyAmount,
              maxDailyTransactionsCount: wallet.maxDailyTransactionsCount,
              maxMonthlyTransactionsCount: wallet.maxMonthlyTransactionsCount,
              whiteListAddresses: wallet.whiteListAddresses,
              received: wallet.fiatBalance.received,
              sent: wallet.fiatBalance.sent,
              balance: wallet.fiatBalance.balance,
              pending: wallet.fiatBalance.pending,
              blocked: wallet.fiatBalance.blocked,
              assets: {
                create: assetData,
              },
            },
          })
        }

        seedMainWallet.push(walletAccount)
      }

      this.response.sendSuccess(res, StatusCodes.OK, {
        data: seedMainWallet,
        message: "Operation successful"
      })
    } catch (err) {
      this.misc.handleServerError(res, err)
    }
  }

  async fetchAllMainWallets(res: Response) {
    try {
      const mainwallet = await this.prisma.walletAccount.findMany({
        include: {
          assets: true
        }
      })

      this.response.sendSuccess(res, StatusCodes.OK, {
        data: mainwallet,
        message: "Accounts and wallets found successfully"
      })
    } catch (err) {
      this.misc.handleServerError(res, err)
    }
  }

  async findMainWalletByAccountId(res: Response, uid: string) {
    try {
      const wallet = await this.prisma.walletAccount.findFirst({
        where: {
          uid: uid
        },
        include: {
          assets: true
        }
      })

      this.response.sendSuccess(res, StatusCodes.OK, {
        data: wallet
      })
    } catch (err) {
      this.misc.handleServerError(res, err)
    }
  }

  async fetchAllAddresses(res: Response) {
    const walletAddress = await this.prisma.walletAddress.findMany({})

    this.response.sendSuccess(res, StatusCodes.OK, {
      data: walletAddress
    })
  }

  async fetchAddressesByAccountId(res: Response, accountId: string) {
    const walletAddress = await this.prisma.walletAddress.findMany({
      where: { accountId }
    })

    this.response.sendSuccess(res, StatusCodes.OK, {
      data: walletAddress
    })
  }
}
