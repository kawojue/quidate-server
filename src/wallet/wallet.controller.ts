import { Response } from 'express'
import { Roles } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import { WalletService } from './wallet.service'
import { SkipThrottle } from '@nestjs/throttler'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { BankDetailsDTO, ValidateBankDTO } from './dto/bank.dto'
import {
  Controller, Get, Post, Param, UseGuards, Req, Res, Query, Body
} from '@nestjs/common'

@SkipThrottle()
@ApiBearerAuth()
@ApiTags("Wallet")
@Controller('wallet')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Get('/verify/bank-details')
  async bankAccountVerification(@Res() res: Response, @Query() query: ValidateBankDTO) {
    await this.walletService.bankAccountVerification(res, query)
  }

  @Get('/fetch/banks')
  async fetchBanks(@Res() res: Response) {
    await this.walletService.fetchBanks(res)
  }

  @Get('/fetch/banks/:bankCode')
  async fetchBank(@Res() res: Response, @Param('bankCode') bankCode: string) {
    await this.walletService.fetchBankByBankCode(res, bankCode)
  }

  @Get('/linked-banks')
  async linkedBanks(@Req() req: IRequest, @Res() res: Response) {
    await this.walletService.linkedBanks(res, req.user)
  }

  @Post('/linked-banks/add')
  async linkBankAccount(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: BankDetailsDTO
  ) {
    await this.walletService.linkBankAccount(res, req.user, body)
  }

  @Get('/linked-banks/:id')
  async getLinkedBank(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    await this.walletService.getLinkedBank(id, res, req.user)
  }

  @Roles('user')
  @Post('/assign-address')
  async assignAddresses(@Res() res: Response, @Req() req: IRequest) {
    await this.walletService.assignAddresses(res, req.user)
  }

  @Roles('admin', 'moderator')
  @Get('/mainwallet/account')
  async fetchAllMainWallets(@Res() res: Response) {
    await this.walletService.fetchAllMainWallets(res)
  }

  @Roles('admin', 'moderator')
  @Get('/mainwallet/account/:uid')
  async findMainWalletByAccountId(@Param('uid') uid: string, @Res() res: Response) {
    await this.walletService.findMainWalletByAccountId(res, uid)
  }

  @Roles('admin', 'moderator')
  @Get('/address')
  async fetchAllAddresses(@Res() res: Response) {
    await this.walletService.fetchAllAddresses(res)
  }

  @Roles('admin', 'moderator')
  @Get('/address/:accountId')
  async fetchAddressesByAccountId(@Res() res: Response, @Param('accountId') accountId: string) {
    await this.walletService.fetchAddressesByAccountId(res, accountId)
  }
}
