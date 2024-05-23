import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import { MiscService } from 'lib/misc.service'
import { StatusCodes } from 'enums/StatusCodes'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { BitPowrSdkService } from 'lib/bitPowr.service'
import { PaystackService } from 'lib/Paystack/paystack.service'

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

  async createAndAssignAddresses(res: Response, { sub: userId }: ExpressUser) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId
        },
        select: {
          virtualAccount: true,
          walletAddresses: true
        }
      })

      if (!user || !user.virtualAccount) {
        this.response.sendError(res, StatusCodes.NotFound, "Create a Virtual Account before assigning addresses")
        return
      }

      if (user.walletAddresses.length) {
        this.response.sendError(res, StatusCodes.Conflict, "You have existing wallet addresses")
        return
      }

      let createdAddresses = []

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
            user: {
              connect: {
                id: userId
              }
            }
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
