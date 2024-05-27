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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { TxAggregateDTO, TxHistoriesDto, TxHistoryDto } from './dto/history.dto'

@ApiTags("User")
@SkipThrottle()
@ApiBearerAuth()
@Controller('user')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) { }

  @ApiOperation({
    summary: "Fetches the user's profile",
  })
  @Roles('user')
  @Get('/me')
  async me(@Req() req: IRequest, @Res() res: Response) {
    return await this.userService.me(res, req.user)
  }

  @ApiOperation({
    summary: "This is to switch the user's primary asset",
  })
  @Roles('user')
  @Patch('/primary-asset/switch')
  async switchPrimaryAsset(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() query: AssetDTO,
  ) {
    return await this.userService.switchPrimaryAsset(res, query, req.user)
  }

  @ApiOperation({
    summary: "Fectches the primary asset metadata",
  })
  @Roles('user')
  @Get('/primary-asset/metadata')
  async fetchAssetMetadata(@Req() req: IRequest, @Res() res: Response) {
    return await this.userService.fetchAssetMetadata(res, req.user)
  }

  @ApiOperation({
    summary: "Fetches the user's transaction histories",
  })
  @Roles('user')
  @Get('/me/tx-histories')
  async fetchTransactionHistories(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() query: TxHistoriesDto,
  ) {
    return await this.userService.fetchTransactionHistories(res, req.user, query)
  }

  @ApiOperation({
    summary: "Calculates the user's money in & out",
  })
  @Roles('user')
  @Get('/me/tx-histories/aggregate')
  async txAggregate(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() query: TxAggregateDTO,
  ) {
    return await this.userService.txAggregate(res, req.user, query)
  }

  @ApiOperation({
    summary: "Fetches the user's transaction history",
  })
  @Roles('user')
  @Get('/me/tx-history')
  async fetchTransactionHistory(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() query: TxHistoryDto,
  ) {
    return await this.userService.fetchTransactionHistory(res, req.user, query)
  }

  @ApiOperation({
    summary: "Fetches the user's bank transfer recipients",
  })
  @Roles('user')
  @Get('/me/bank-recipients')
  async fetchRecipients(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() query: RecipientDto,
  ) {
    return await this.userService.fetchRecipients(res, req.user, query)
  }

  @ApiOperation({
    summary: "Fetches the user's addresses"
  })
  @Roles('user')
  @Get('/me/address')
  async fetchWalletAddresses(@Req() req: IRequest, @Res() res: Response) {
    return await this.userService.fetchWalletAddresses(res, req.user)
  }

  @ApiOperation({
    summary: "Fetches the user's address"
  })
  @Roles('user')
  @Get('/me/address/:address')
  async fetchWalletAddress(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('address') address: string
  ) {
    return await this.userService.fetchWalletAddress(res, req.user, address)
  }

  @ApiOperation({
    summary: "Fetches the user's notifications"
  })
  @Roles('user')
  @Get('/me/notifications')
  async fetchNotifications(@Res() res: Response, @Req() req: IRequest) {
    return await this.userService.fetchNotifications(res, req.user)
  }
}
