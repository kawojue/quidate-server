import { ApiTags } from '@nestjs/swagger'
import { Response, Request } from 'express'
import {
  FetchProductsDto, FXRateDTO, InfiniteScrollDto, SearchDto,
} from './dto/gift-card.dto'
import { GiftCardService } from './gift-card.service'
import { Body, Controller, Get, Param, Query, Res } from '@nestjs/common'

@ApiTags("Gift Card")
@Controller('gift-card')
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) { }

  @Get('/brands')
  async fetchBrands(@Res() res: Response, @Query() query: SearchDto) {
    await this.giftCardService.fetchBrands(res, query)
  }

  @Get('/countries')
  async fetchCountries(@Res() res: Response) {
    await this.giftCardService.fetchCountries(res)
  }

  @Get('/products')
  async fetchProducts(
    @Res() res: Response,
    @Query() query: FetchProductsDto,
  ) {
    await this.giftCardService.fetchProducts(res, query)
  }

  @Get('/discount-products')
  async fetchDiscountProducts(
    @Res() res: Response,
    @Query() query: InfiniteScrollDto,
  ) {
    await this.giftCardService.fetchDiscountProducts(res, query)
  }

  @Get('/products/:productId')
  async fetchProductById(
    @Res() res: Response,
    @Param('productId') productId: string
  ) {
    await this.giftCardService.fetchProductById(res, productId)
  }

  @Get('/discount-products/:productId')
  async fetchDiscountProduct(
    @Res() res: Response,
    @Param('productId') productId: string
  ) {
    await this.giftCardService.fetchDiscountProduct(res, productId)
  }

  @Get('/fx-rate')
  async fxRate(
    @Res() res: Response,
    @Query() query: FXRateDTO
  ) {
    await this.giftCardService.fxRate(res, query)
  }
}
