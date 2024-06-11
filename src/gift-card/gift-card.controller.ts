import { Response } from 'express'
import {
  Body, Controller, Get, Param,
  Post, Query, Req, Res, UseGuards,
} from '@nestjs/common'
import { Roles } from '@prisma/client'
import {
  InfiniteScrollDto, PurchaseGiftCardDTO,
  FetchProductsDto, FXRateDTO, SearchDto,
} from './dto/gift-card.dto'
import { AuthGuard } from '@nestjs/passport'
import { Roles as Role } from 'src/role.decorator'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { GiftCardService } from './gift-card.service'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

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

  @ApiBearerAuth()
  @Role(Roles.user)
  @Post('/purchase/:productId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async purchaseGiftCard(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: PurchaseGiftCardDTO,
    @Param('productId') productId: string,
  ) {
    await this.giftCardService.purchaseGiftCard(res, req.user, productId, body)
  }

  @Get('/redeems')
  async redeemCode(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() q: InfiniteScrollDto
  ) {
    await this.giftCardService.fetchRedeemCodes(res, req.user, q)
  }
}
