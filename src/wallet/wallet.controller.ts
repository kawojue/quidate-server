import { Response } from 'express'
import { Roles } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import { WalletService } from './wallet.service'
import { SkipThrottle } from '@nestjs/throttler'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Controller, Get, Post, Param, UseGuards, Req, Res } from '@nestjs/common'

@ApiTags("Wallets")
@SkipThrottle()
@Controller('wallets')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Roles('user')
  @Post('/create-address')
  async createAndAssignAddresses(@Res() res: Response, @Req() req: IRequest) {
    return await this.walletService.createAndAssignAddresses(res, req.user)
  }

  @Roles('admin', 'moderator')
  @Get('/mainwallet/account')
  async fetchAllMainWallets(@Res() res: Response) {
    return await this.walletService.fetchAllMainWallets(res)
  }

  @Roles('admin', 'moderator')
  @Get('/mainwallet/account/:uid')
  async findMainWalletByAccountId(@Param('uid') uid: string, @Res() res: Response) {
    return await this.walletService.findMainWalletByAccountId(res, uid)
  }

  @Roles('admin', 'moderator')
  @Get('/address')
  async fetchAllAddresses(@Res() res: Response) {
    return await this.walletService.fetchAllAddresses(res)
  }

  @Roles('admin', 'moderator')
  @Get('/address/:accountId')
  async fetchAddressesByAccountId(@Res() res: Response, @Param('accountId') accountId: string) {
    return await this.walletService.fetchAddressesByAccountId(res, accountId)
  }
}
