import { Response } from 'express'
import { PrismaService } from 'prisma'
import { Injectable } from '@nestjs/common'
import { StatusCodes } from 'enums/StatusCodes'
import { PlunkService } from 'lib/plunk.service'
import {
    FetchProductsDto, InfiniteScrollDto, SearchDto
} from './dto/gift-card.dto'
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
        { search = '', page = 1, limit = 100, isoName = '' }: FetchProductsDto
    ) {
        let { content: products } = await this.consumer.sendRequest<GiftCardProducts>('GET', `products?size=${limit}&page=${page}&countryCode=${isoName}`)

        if (search.trim()) {
            products = products.filter((product) => {
                if (
                    search
                        .toLowerCase()
                        .includes(product.country.name.toLowerCase()) ||
                    search
                        .toLowerCase()
                        .includes(product.brand.brandName.toLowerCase())
                ) {
                    return product
                }
            })
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: { products, total: products.length } })
    }

    async fetchProductById(res: Response, productId: string) {
        const product = await this.consumer.sendRequest<GiftCardProduct>('GET', `products/${productId}`)

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

    async fxRate(res: Response) {
        const rate = await this.consumer.sendRequest('GET', 'fx-rate?currencyCode=USD&amount=1')

        this.response.sendSuccess(res, StatusCodes.OK, { data: rate })
    }
}
