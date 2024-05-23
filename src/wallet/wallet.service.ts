import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import { MiscService } from 'lib/misc.service'
import { StatusCodes } from 'enums/StatusCodes'
import { toUpperCase } from 'helpers/transformer'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { BitPowrSdkService } from 'lib/bitPowr.service'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { BankDetailsDTO, ValidateBankDTO } from './dto/bank.dto'

@Injectable()
export class WalletService {
  private bitPowerSdk: any

  constructor(
    private readonly misc: MiscService,
    private readonly prisma: PrismaService,
    private readonly response: ResponseService,
    private readonly paystack: PaystackService,
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
        return this.response.sendError(res, StatusCodes.NotFound, "Create a Virtual Account before assigning addresses")
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
