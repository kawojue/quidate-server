import { JwtService } from '@nestjs/jwt'
import { Response, Request } from 'express'
import { Injectable } from '@nestjs/common'
import { MiscService } from 'lib/misc.service'
import { StatusCodes } from 'enums/statusCodes'
import { titleText } from 'helpers/transformer'
import { PrismaService } from 'prisma/prisma.service'
import { LoginDto, RegisterDto } from './dto/auth.dto'
import { ResponseService } from 'lib/response.service'
import { BitPowrSdkService } from 'lib/bitPowr.service'
import { EncryptionService } from 'lib/encryption.service'
import { FetchDTO } from 'src/gift-card/dto/gift-card.dto'

@Injectable()
export class ModminService {
    private bitPowerSdk: any
    constructor(
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly response: ResponseService,
        private readonly encryptionService: EncryptionService,
    ) {
        this.bitPowerSdk = new BitPowrSdkService().getSdk()
    }

    async register(
        res: Response,
        { email, password, fullName, registrationKey }: RegisterDto
    ) {
        try {
            fullName = titleText(fullName)
            const decodedKey = atob(registrationKey as string)
            if (decodedKey !== process.env.ADMIN_REGISTRATION_KEY) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Invalid registration key')
                return
            }

            const modmins = await this.prisma.modmin.count()
            if (modmins === 10) {
                this.response.sendError(res, StatusCodes.Forbidden, "Maximum moderators reached.")
                return
            }

            const modmin = await this.prisma.modmin.findUnique({
                where: { email }
            })

            if (modmin) {
                this.response.sendError(res, StatusCodes.Conflict, `Warning! Existing ${modmin.role}`)
                return
            }

            password = await this.encryptionService.hash(password)

            await this.prisma.modmin.create({
                data: { email, fullName, password }
            })

            this.response.sendSuccess(res, StatusCodes.Created, { message: "You're now a Moderator!" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async login(
        res: Response,
        { email, password }: LoginDto
    ) {
        try {
            const modmin = await this.prisma.modmin.findUnique({ where: { email } })
            if (!modmin) {
                this.response.sendError(res, StatusCodes.NotFound, 'Warning! Invalid email or password')
                return
            }

            const isMatch = await this.encryptionService.compare(password, modmin.password)

            if (!isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Incorrect Password')
                return
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                access_token: await this.misc.generateNewAccessToken({
                    sub: modmin.id,
                    role: modmin.role,
                    userStatus: modmin.status
                }),
                data: {
                    role: modmin.role,
                    email: modmin.email,
                    fullname: modmin.fullName,
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async toggleUserSuspension(res: Response, userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return this.response.sendError(res, StatusCodes.NotFound, "User not found")
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { userStatus: user.userStatus === 'active' ? 'suspended' : 'active' },
            select: {
                id: true,
                userStatus: true
            }
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: updatedUser })
    }

    async fetchUsers(
        res: Response,
        {
            search = '', sortBy,
            page = 1, limit = 100,
        }: FetchDTO
    ) {
        try {
            search = search?.trim() ?? ''

            limit = Number(limit)
            const offset = (page - 1) * limit

            const users = await this.prisma.user.findMany({
                where: {
                    OR: [
                        { fullName: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                    ]
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
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
