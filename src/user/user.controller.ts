import {
  Req, Res, Query, Controller,
  Param, UseGuards, Patch, Get,
} from '@nestjs/common'
import { Response } from 'express'
import { Roles } from 'src/role.decorator'
import { AssetDTO } from './dto/asset.dto'
import { UserService } from './user.service'
import { AuthGuard } from '@nestjs/passport'
import { SkipThrottle } from '@nestjs/throttler'
import { RecipientDto } from './dto/recipient.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { TxAggregateDTO, TxHistoriesDto, TxHistoryDto } from './dto/history.dto'

@ApiTags("User")
@SkipThrottle()
@ApiBearerAuth()
@Controller('user')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Roles('user')
  @Get('')
  async me(@Req() req: IRequest, @Res() res: Response) {
    await this.userService.me(res, req.user)
  }

  @Roles('user')
  @Patch('/primary-asset/switch')
  async switchPrimaryAsset(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() query: AssetDTO,
  ) {
    await this.userService.switchPrimaryAsset(res, query, req.user)
  }

  @Roles('user')
  @Get('/primary-assettadata')
  async fetchAssetMetadata(@Req() req: IRequest, @Res() res: Response) {
    await this.userService.fetchAssetMetadata(res, req.user)
  }

  @Roles('user')
  @Get('/tx-histories')
  async fetchTransactionHistories(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() query: TxHistoriesDto,
  ) {
    await this.userService.fetchTransactionHistories(res, req.user, query)
  }

  @Roles('user')
  @Get('/tx-histories/aggregate')
  async txAggregate(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() query: TxAggregateDTO,
  ) {
    await this.userService.txAggregate(res, req.user, query)
  }

  @Roles('user')
  @Get('/tx-history')
  async fetchTransactionHistory(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() query: TxHistoryDto,
  ) {
    await this.userService.fetchTransactionHistory(res, req.user, query)
  }

  @Roles('user')
  @Get('/bank-recipients')
  async fetchRecipients(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() query: RecipientDto,
  ) {
    await this.userService.fetchRecipients(res, req.user, query)
  }

  @Roles('user')
  @Get('/address')
  async fetchWalletAddresses(@Req() req: IRequest, @Res() res: Response) {
    await this.userService.fetchWalletAddresses(res, req.user)
  }

  @Roles('user')
  @Get('/address/:address')
  async fetchWalletAddress(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('address') address: string
  ) {
    await this.userService.fetchWalletAddress(res, req.user, address)
  }

  @Roles('user')
  @Get('/notifications')
  async fetchNotifications(@Res() res: Response, @Req() req: IRequest) {
    await this.userService.fetchNotifications(res, req.user)
  }

  @Roles('user')
  @Get('/tiers')
  async fetchTiers(@Req() req: IRequest, @Res() res: Response) {
    await this.userService.fetchTiers(res, req.user)
  }
}
