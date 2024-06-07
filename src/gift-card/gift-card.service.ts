import { Response } from 'express'
import {
    FetchProductsDto, FXRateDTO, SearchDto,
    InfiniteScrollDto, PurchaseGiftCardDTO,
} from './dto/gift-card.dto'
import { Injectable } from '@nestjs/common'
import { StatusCodes } from 'enums/statusCodes'
import { PlunkService } from 'lib/plunk.service'
import { genRandomCode } from 'helpers/generator'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { Consumer } from 'lib/Reloadly/reloadly.service'

@Injectable()
export class GiftCardService {
    private consumer: Consumer

    constructor(
        private readonly plunk: PlunkService,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
    ) { this.consumer = new Consumer('https://giftcards-sandbox.reloadly.com', this.prisma) }

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

            const filteredProducts = search.trim() ? products.filter((product) => {
                const searchTerm = search.toLowerCase()
                return (
                    product.productName.toLowerCase().includes(searchTerm) ||
                    product.country.name.toLowerCase().includes(searchTerm) ||
                    product.brand.brandName.toLowerCase().includes(searchTerm)
                )
            }) : products

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { products: filteredProducts, total: filteredProducts.length }
            })
        } catch (error) {
            console.error('Error fetching products:', error)
            this.response.sendError(res, StatusCodes.InternalServerError, 'Failed to fetch products')
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

        if (search.trim()) {
            brands = brands.filter(brand => {
                if (search
                    .toLowerCase()
                    .includes(brand.name.toLowerCase())) {
                    return brand
                }
            })
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: brands })
    }

    async fetchDiscountProducts(
        res: Response,
        { search = '', page = 1, limit = 100 }: InfiniteScrollDto
    ) {
        let { content: discountProducts } = await this.consumer.sendRequest<GiftCardDiscountProducts>('GET', `discounts?size=${limit}&page=${page}`)

        if (search.trim()) {
            discountProducts = discountProducts.filter(discount => {
                if (
                    search
                        .toLowerCase()
                        .includes(discount.product.productName.toLowerCase()) ||
                    search
                        .toLowerCase()
                        .includes(discount.product.countryCode.toLowerCase())
                ) {
                    return discount
                }
            })
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: discountProducts })
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
        {
            quantity, productId, unitPrice
        }: PurchaseGiftCardDTO
    ) {
        try {
            const product = await this.consumer.sendRequest<GiftCardProduct>('GET', `products/${productId}`) || null

            if (!product) {
                return this.response.sendError(res, StatusCodes.NotFound, "Product not found")
            }

            if (product.denominationType === "FIXED") {
                if (!product.fixedRecipientDenominations.includes(unitPrice)) {
                    return this.response.sendError(res, StatusCodes.BadRequest, "Invalid unit price")
                }
            }

            if (product.denominationType === "RANGE") {
                if (unitPrice > product.maxRecipientDenomination || unitPrice < product.minRecipientDenomination) {
                    return this.response.sendError(res, StatusCodes.BadRequest, "Invalid unit price")
                }
            }

            const user = await this.prisma.user.findUnique({
                where: { id: sub }
            })

            const payload = {
                senderName: user.fullName,
                recipientEmail: user.email,
                unitPrice, productId, quantity,
                customIdentifier: `${genRandomCode()}`
            }

            const order = await this.consumer.sendRequest<GiftCardTransaction>('POST', 'orders', payload)

            // const tx = await this.prisma.transactionHistory.create({
            //     data: {

            //         user: {connect: {id: sub}}
            //     }
            // })
        } catch (err) {

        }
    }

    async redeemCode() { }
}
