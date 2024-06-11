import { Response, Request } from 'express'
import { Injectable } from '@nestjs/common'
import { StatusCodes } from 'enums/statusCodes'
import { PlunkService } from 'lib/plunk.service'
import { genRandomCode } from 'helpers/generator'
import { CreateInvoiceDto } from './dto/create.dto'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { BitPowrSdkService } from 'lib/bitPowr.service'
import { PriceConversionService } from 'lib/price-conversion'
import { AssetType, TransactionHistory } from '@prisma/client'
import { InfiniteScrollDto } from 'src/gift-card/dto/gift-card.dto'

@Injectable()
export class InvoiceService {
    private bitPowerSdk: any

    constructor(
        private readonly plunk: PlunkService,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
        readonly bitPowerSdkService: BitPowrSdkService,
        private readonly conversion: PriceConversionService,
    ) {
        this.bitPowerSdk = bitPowerSdkService.getSdk()
    }

    async createInvoice(
        res: Response,
        { sub }: ExpressUser,
        {
            items, clientInfo, currency, assetType,
            accountName, accountNumber, orderNo, bankName,
            subject, paymentType, description, walletAddress,
        }: CreateInvoiceDto,
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: sub },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    profile: {
                        select: { phone: true }
                    }
                }
            })

            const wallet = await this.prisma.wallet.findUnique({
                where: { userId: sub },
            })

            if (items.length === 0) {
                return this.response.sendError(res, StatusCodes.BadRequest, "No Item was added")
            }

            if (items.length > 25) {
                return this.response.sendError(res, StatusCodes.PayloadTooLarge, 'Only a maximum of 25 items is allowed')
            }

            let totalAmount: number = 0
            let invoiceItems: Item[] = []

            for await (const { name, amount, quantity, rate } of items) {
                if ((!rate || !quantity) && !amount) {
                    return this.response.sendError(res, StatusCodes.BadRequest, 'Rate and Quantity or Amount is required')
                }

                let predefinedAmount = amount
                if (rate && quantity) {
                    predefinedAmount = rate * quantity
                }

                invoiceItems.push({
                    name, rate, quantity,
                    amount: predefinedAmount,
                })

                totalAmount += predefinedAmount
            }

            let isFree: boolean = true
            const invoiceNo = `inv-${genRandomCode()}`

            const isAbleToCreateFreeInvoice = await this.prisma.hasCreatedFreeInvoicesTwiceThisMonth(sub)

            if (!isAbleToCreateFreeInvoice) {
                const INV_AMOUNT_NGN = 50 as const
                const { price: INV_AMOUNT_USD } = await this.conversion.convert_currency(INV_AMOUNT_NGN, 'NGN_TO_USD')

                if (wallet.ngnBalance < INV_AMOUNT_NGN && wallet.usdBalance < INV_AMOUNT_USD) {
                    return this.response.sendError(res, StatusCodes.UnprocessableEntity, 'Insufficient balance')
                }

                isFree = false
            }

            if (paymentType === 'fiat') {
                if (!bankName || !accountName || !accountNumber) {
                    const vtu = await this.prisma.linkedBank.findFirst({
                        where: { primary: true, userId: sub }
                    })

                    if (!vtu) {
                        return this.response.sendError(res, StatusCodes.NotFound, "No primary bank account linked")
                    }

                    bankName = vtu.bankName
                    accountName = vtu.accountName
                    accountNumber = vtu.accountNumber
                }
            }

            let generatedAddress = {} as {
                walletAddress: string
                mode: string
                chain: string
                label: string
                network: string
                assetId: string
                assetType: AssetType
                addressType: string
            }

            if (paymentType === 'crypto') {
                if (!assetType) {
                    return this.response.sendError(res, StatusCodes.BadRequest, 'Asset is required when the payment type is cryptocurrency')
                }

                if (!walletAddress) {
                    const walletAccount = await this.prisma.walletAccount.findFirst({
                        where: {
                            isActive: true,
                        },
                        include: {
                            assets: true,
                        }
                    })

                    if (!walletAccount) {
                        this.response.sendError(res, StatusCodes.NotFound, "There are no accounts at the moment to generate wallet address from")

                        // Todo: notify admin

                        return
                    }

                    const { data: { data: address } } = await this.bitPowerSdk.createaddresses({
                        label: sub,
                        asset: walletAccount.assets['assetType'] = assetType,
                        accountId: walletAccount.uid,
                    })

                    assetType = address.assetType
                    walletAddress = address.address

                    generatedAddress = {
                        assetType,
                        walletAddress,
                        mode: address.mode,
                        chain: address.chain,
                        label: address.label,
                        assetId: address.assetId,
                        network: address.network,
                        addressType: address.addressType,
                    }
                }
            }

            if (isFree === false) {
                const INV_AMOUNT_NGN = 50
                const { price: INV_AMOUNT_USD, rate } = await this.conversion.convert_currency(INV_AMOUNT_NGN, 'NGN_TO_USD')

                let history: TransactionHistory

                if (wallet.ngnBalance > INV_AMOUNT_NGN) {
                    await this.prisma.wallet.update({
                        where: { userId: sub },
                        data: { ngnBalance: { decrement: INV_AMOUNT_NGN } }
                    })
                    history = await this.prisma.transactionHistory.create({
                        data: {
                            ref: invoiceNo,
                            source: 'fiat',
                            currency: 'NGN',
                            status: 'COMPLETED',
                            type: 'DISBURSEMENT',
                            amount: INV_AMOUNT_NGN,
                            settlementAmount: INV_AMOUNT_NGN,
                            description: 'Debit - from Quidate',
                            user: { connect: { id: sub } }
                        }
                    })
                    await this.prisma.notification.create({
                        data: {
                            reference: history.ref,
                            title: 'Invoice - Debit',
                            description: `₦${INV_AMOUNT_NGN} was charged from your NGN account`,
                            user: { connect: { id: sub } }
                        }
                    })
                } else {
                    await this.prisma.wallet.update({
                        where: { userId: sub },
                        data: { usdBalance: { decrement: INV_AMOUNT_USD } }
                    })
                    history = await this.prisma.transactionHistory.create({
                        data: {
                            ref: invoiceNo,
                            source: 'fiat',
                            currency: 'USD',
                            dollarRate: rate,
                            status: 'COMPLETED',
                            type: 'DISBURSEMENT',
                            amount: INV_AMOUNT_USD,
                            dollarAmount: INV_AMOUNT_USD,
                            settlementAmount: INV_AMOUNT_NGN,
                            description: 'Debit - from Quidate',
                            user: { connect: { id: sub } }
                        }
                    })
                    await this.prisma.notification.create({
                        data: {
                            reference: history.ref,
                            title: 'Invoice - Debit',
                            description: `$${INV_AMOUNT_USD.toFixed(2)} was charged from your USD account`,
                            user: { connect: { id: sub } }
                        }
                    })
                }
            }

            const invoice = await this.prisma.invoice.create({
                data: {
                    isFree,
                    orderNo,
                    subject,
                    currency,
                    bankName,
                    clientInfo,
                    description,
                    totalAmount,
                    accountName,
                    paymentType,
                    accountNumber,
                    items: invoiceItems as any,
                    ...generatedAddress,
                    assetType,
                    walletAddress,
                    issuer_email: user.email,
                    issuer_name: user.fullName,
                    invoiceNo: invoiceNo.toUpperCase(),
                    issuer_phone: user.profile.phone,
                    user: { connect: { id: sub } }
                }
            })

            this.response.sendSuccess(res, StatusCodes.Created, {
                data: invoice,
                generatedLink: `${process.env.CLIENT_URL}/invoice/${invoice.invoiceNo.toLowerCase()}`
            })
        } catch (err) {
            console.error(err)
            // TODO: mail admin
            this.response.sendError(res, StatusCodes.InternalServerError, 'Error creating invoice')
        }
    }

    async getInvoice(req: Request, res: Response, invoiceNo: string) {
        // @ts-ignore
        const sub = req.user?.sub

        const invoice = await this.prisma.invoice.findUnique({
            where: { invoiceNo: invoiceNo.toUpperCase() }
        })

        if (!invoice) {
            return this.response.sendError(res, StatusCodes.NotFound, 'Invoice not found')
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: invoice })

        res.on('finish', async () => {
            if (sub !== invoice.userId) {
                await this.plunk.sendPlunkEmail({
                    to: invoice.issuer_email,
                    subject: 'Invoice Clicked',
                    body: `Hello, ${invoice.issuer_name}. Your invoice was opened. ${process.env.CLIENT_URL}/invoice/${invoice.invoiceNo.toLowerCase()}`
                })
                // TODO: Email template
            }
        })
    }

    async fetchInvoices(
        res: Response,
        { sub }: ExpressUser,
        { limit = 20, page = 1, search = '' }: InfiniteScrollDto
    ) {
        page = Number(page)
        limit = Number(limit)
        const offset = (page - 1) * limit

        const OR = [
            { orderNo: { contains: search, mode: 'insensitive' } },
            { invoiceNo: { contains: search, mode: 'insensitive' } },
            { clientInfo: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ]

        const invoices = await this.prisma.invoice.findMany({
            // @ts-ignore
            where: { userId: sub, OR },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                isFree: true,
                subject: true,
                currency: true,
                createdAt: true,
                invoiceNo: true,
                clientInfo: true,
                paymentType: true,
                totalAmount: true,
            },
            take: limit,
            skip: offset,
        })

        const totalCount = await this.prisma.invoice.count({
            // @ts-ignore
            where: { userId: sub, OR },
        })

        const totalPages = Math.ceil(totalCount / limit)

        const hasNext = page < totalPages
        const hasPrev = page > 1
        const currentPage = page
        const total = totalCount

        this.response.sendSuccess(res, StatusCodes.OK, {
            data: invoices,
            metadata: {
                total,
                hasNext,
                hasPrev,
                totalPages,
                currentPage,
            }
        })
    }

    async removeInvoice(
        res: Response,
        invoiceNo: string,
        { sub }: ExpressUser,
    ) {
        const invoice = await this.prisma.invoice.findUnique({
            where: {
                userId: sub,
                invoiceNo: invoiceNo.toUpperCase(),
            }
        })

        if (!invoice) {
            return this.response.sendError(res, StatusCodes.NotFound, 'Invoice not found')
        }

        await this.prisma.invoice.delete({
            where: {
                userId: sub,
                id: invoice.id
            }
        })

        this.response.sendSuccess(res, StatusCodes.OK, {
            message: "Your invoice has been removed"
        })
    }
}