import { Response } from 'express'
import {
    FetchProductsDto, FXRateDTO, SearchDto,
    InfiniteScrollDto, PurchaseGiftCardDTO,
} from './dto/gift-card.dto'
import { Injectable } from '@nestjs/common'
import { MiscService } from 'lib/misc.service'
import { StatusCodes } from 'enums/statusCodes'
import { PlunkService } from 'lib/plunk.service'
import { genRandomCode } from 'helpers/generator'
import { toLowerCase } from 'helpers/transformer'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { Consumer } from 'lib/Reloadly/reloadly.service'
import { TransferStatus } from '@prisma/client'

@Injectable()
export class GiftCardService {
    private consumer: Consumer

    constructor(
        private readonly misc: MiscService,
        private readonly plunk: PlunkService,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
    ) { this.consumer = new Consumer('https://giftcards-sandbox.reloadly.com', this.prisma) }

    private getSenderDenomination(recipientDenomination: number, map: { [key: string]: number }): number | null {
        const senderDenomination = map[recipientDenomination.toString()]
        return senderDenomination !== undefined ? senderDenomination : null
    }

    private getRecipientDenomination(senderDenomination: number, map: { [key: string]: number }): number | null {
        for (const [key, value] of Object.entries(map)) {
            if (value === senderDenomination) {
                return parseFloat(key)
            }
        }
        return null
    }

    async fetchCountries(res: Response) {
        const countries = await this.consumer.sendRequest<GiftCardCountryInfo[]>('GET', 'countries')

        this.response.sendSuccess(res, StatusCodes.OK, { data: countries })
    }

    async fetchProducts(
        res: Response,
        {
            search = '', page = 1,
            limit = 100, isoName = ''
        }: FetchProductsDto
    ) {
        try {
            const { content: products } = await this.consumer.sendRequest<GiftCardProducts>('GET', `products?size=${limit}&page=${page}&countryCode=${isoName}`)

            const filteredProducts = products.filter((product) => {
                return (
                    toLowerCase(product.productName).includes(search) ||
                    toLowerCase(product.country.name).includes(search) ||
                    toLowerCase(product.brand.brandName).includes(search)
                )
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { products: filteredProducts, total: filteredProducts.length }
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Failed to fetch products')
        }
    }

    async fetchProductById(res: Response, productId: string) {
        const product = await this.consumer.sendRequest<GiftCardProduct>('GET', `products/${productId}`) || null

        if (!product) {
            return this.response.sendError(res, StatusCodes.NotFound, "Product not found")
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: product })
    }

    async fetchBrands(res: Response, { search = '' }: SearchDto) {
        let brands = await this.consumer.sendRequest<Brand[]>('GET', 'brands')

        brands = brands.filter(brand => {
            if (toLowerCase(brand.name).includes(search)) {
                return brand
            }
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: brands })
    }

    async fetchDiscountProducts(
        res: Response,
        { search = '', page = 1, limit = 100 }: InfiniteScrollDto
    ) {
        let { content: discountProducts } = await this.consumer.sendRequest<GiftCardDiscountProducts>('GET', `discounts?size=${limit}&page=${page}`)

        const products = discountProducts.filter(discount => {
            if (
                toLowerCase(discount.product.productName).includes(search) ||
                toLowerCase(discount.product.countryCode).includes(search)
            ) {
                return discount
            }
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: products })
    }

    async fetchDiscountProduct(res: Response, produtctId: string) {
        const discountProduct = await this.consumer.sendRequest<GiftCardDiscountProduct>('GET', `products/${produtctId}/discounts`)

        this.response.sendSuccess(res, StatusCodes.OK, { data: discountProduct })
    }

    async fxRate(res: Response, { currencyCode, amount }: FXRateDTO) {
        const rate = await this.consumer.sendRequest('GET', `fx-rate?currencyCode=${currencyCode}&amount=${amount}`)

        this.response.sendSuccess(res, StatusCodes.OK, { data: rate })
    }

    async purchaseGiftCard(
        res: Response,
        { sub }: ExpressUser,
        productId: string,
        {
            quantity, unitPrice, tx_source
        }: PurchaseGiftCardDTO
    ) {
        try {
            const product = await this.consumer.sendRequest<GiftCardProduct>('GET', `products/${productId}`) || null

            if (!product) {
                return this.response.sendError(res, StatusCodes.NotFound, "Product not found")
            }

            let senderPrice: number | null = null

            if (product.denominationType === "FIXED") {
                if (!product.fixedRecipientDenominations.includes(unitPrice)) {
                    return this.response.sendError(res, StatusCodes.BadRequest, "Unit price is not listed")
                }

                senderPrice = this.getRecipientDenomination(unitPrice, product.fixedRecipientToSenderDenominationsMap)
                console.log({ senderPrice })
            }

            if (product.denominationType === "RANGE") {
                if (unitPrice > product.maxRecipientDenomination || unitPrice < product.minRecipientDenomination) {
                    return this.response.sendError(res, StatusCodes.BadRequest, "Unit price is out of range")
                }

                const rate = await this.consumer.sendRequest<FxRate>('GET', `fx-rate?currencyCode=${product.recipientCurrencyCode}&amount=${unitPrice}`)

                senderPrice = rate.senderAmount
            }

            let discountAmount = 0
            if (product.discountPercentage) {
                discountAmount = senderPrice * (product.discountPercentage / 100)
            }
            const discountedPrice = senderPrice - discountAmount
            console.log({ discountedPrice })
            const senderCostNGN = discountedPrice + product.senderFee
            console.log({ senderCostNGN })
            const totalSenderCostNGN = senderCostNGN * quantity
            console.log({ totalSenderCostNGN })

            const rate = await this.consumer.sendRequest<FxRate>('GET', `fx-rate?currencyCode=USD&amount=${1}`)

            const senderCostUSD = senderCostNGN / rate.recipientAmount
            const totalSenderCostUSD = totalSenderCostNGN / rate.recipientAmount

            const user = await this.prisma.user.findUnique({
                where: { id: sub },
                include: { wallet: true }
            })

            if (tx_source === "NGN") {
                if (user.wallet.ngnBalance < totalSenderCostNGN) {
                    return this.response.sendError(res, StatusCodes.UnprocessableEntity, "Insufficient balance")
                }
            }

            if (tx_source === "USD") {
                if (user.wallet.usdBalance < totalSenderCostUSD) {
                    return this.response.sendError(res, StatusCodes.UnprocessableEntity, "Insufficient balance")
                }
            }

            const payload = {
                senderName: user.fullName,
                recipientEmail: user.email,
                unitPrice, productId, quantity,
                customIdentifier: `giftcard-${genRandomCode()}`
            }

            const order = await this.consumer.sendRequest<GiftCardTransaction>('POST', 'orders', payload)

            console.log(order)

            await this.prisma.manageBalance(sub, tx_source === "NGN" ? 'ngnBalance' : 'usdBalance', tx_source === "NGN" ? totalSenderCostNGN : totalSenderCostUSD, 'decrement')

            const tx = await this.prisma.transactionHistory.create({
                data: {
                    source: 'fiat',
                    currency: tx_source,
                    totalFee: order.fee,
                    type: 'DISBURSEMENT',
                    txId: order.transactionId,
                    ref: order.customIdentifier,
                    discount: discountedPrice,
                    user: { connect: { id: sub } },
                    quantity: order.product.quantity,
                    unitPrice: order.product.unitPrice,
                    productId: order.product.productId,
                    recipientEmail: order.recipientEmail,
                    status: order.status as TransferStatus,
                    amount: tx_source === "NGN" ? senderCostNGN : senderCostUSD,
                    settlementAmount: tx_source === "NGN" ? totalSenderCostNGN : totalSenderCostUSD,
                }
            })

            console.log(tx)

            this.response.sendSuccess(res, StatusCodes.OK, { data: tx })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async redeemCode() { }
}
