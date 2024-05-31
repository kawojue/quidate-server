import { Roles } from 'src/role.decorator'
import { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { Roles as Role } from '@prisma/client'
import { MiscService } from 'lib/misc.service'
import { StatusCodes } from 'enums/statusCodes'
import { WalletService } from './wallet.service'
import { SkipThrottle } from '@nestjs/throttler'
import {
  InitiateLocalTransferDTO, GetReceiverDTO,
  AmountDTO, InitiateWithdrawalDTO, TxSourceDTO,
} from './dto/tx.dto'
import { FundWalletDTO } from './dto/deposit.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ResponseService } from 'lib/response.service'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PriceConversionService } from 'lib/price-conversion'
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
  constructor(
    private readonly misc: MiscService,
    private readonly response: ResponseService,
    private readonly walletService: WalletService,
    private readonly conversion: PriceConversionService,
  ) { }

  @Get('/verify/bank-details')
  @Roles(Role.user)
  async bankAccountVerification(@Res() res: Response, @Query() query: ValidateBankDTO) {
    await this.walletService.bankAccountVerification(res, query)
  }

  @Get('/fetch/banks')
  @Roles(Role.user)
  async fetchBanks(@Res() res: Response) {
    await this.walletService.fetchBanks(res)
  }

  @Get('/fetch/banks/:bankCode')
  @Roles(Role.user)
  async fetchBank(@Res() res: Response, @Param('bankCode') bankCode: string) {
    await this.walletService.fetchBankByBankCode(res, bankCode)
  }

  @Get('/linked-banks')
  @Roles(Role.user)
  async linkedBanks(@Req() req: IRequest, @Res() res: Response) {
    await this.walletService.linkedBanks(res, req.user)
  }

  @Post('/linked-banks/add')
  @Roles(Role.user)
  async linkBankAccount(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: BankDetailsDTO
  ) {
    await this.walletService.linkBankAccount(res, req.user, body)
  }

  @Get('/linked-banks/:id')
  @Roles(Role.user)
  async getLinkedBank(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    await this.walletService.getLinkedBank(id, res, req.user)
  }

  @Post('/deposit')
  @Roles(Role.user)
  async fundWallet(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: FundWalletDTO
  ) {
    await this.walletService.fundWallet(res, req.user, body)
  }

  @Post('/withdraw/:linkedBankId')
  async initiateWithdrawal(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: TxSourceDTO,
    @Body() body: InitiateWithdrawalDTO,
    @Param('linkedBankId') linkedBankId: string,
  ) {
    await this.walletService.initiateWithdrawal(req, res, linkedBankId, query, body)
  }

  @Roles('user')
  @Post('/assign-address')
  async assignAddresses(@Res() res: Response, @Req() req: IRequest) {
    await this.walletService.assignAddresses(res, req.user)
  }

  @Get('/ngn-usd')
  async internalNGNTOUSD(@Res() res: Response, @Query() { amount }: AmountDTO) {
    const ngn = Number(amount)
    const usd = await this.conversion.convert_currency(ngn, 'NGN_TO_USD')

    this.response.sendSuccess(res, StatusCodes.OK, {
      data: { ngn, usd }
    })
  }

  @Post('/ngn-usd')
  @Roles(Role.user)
  async sendInternalNGNTOUSD(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: AmountDTO
  ) {
    await this.walletService.sendInternalNGNTOUSD(res, req.user, body)
  }

  @Post('/usd-usd')
  @Roles(Role.user)
  async sendInternalUSDTONGN(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: AmountDTO
  ) {
    await this.walletService.sendInternalUSDTONGN(res, req.user, body)
  }

  @Get('/usd-ngn')
  async internalUSDTONGN(@Res() res: Response, @Query() { amount }: AmountDTO) {
    const usd = Number(amount)
    const fee = this.misc.calculateUSDFee(usd)
    const ngn = await this.conversion.convert_currency(usd, 'USD_TO_NGN')
    const settlementAmount = await this.conversion.convert_currency((usd - fee), 'USD_TO_NGN')

    this.response.sendSuccess(res, StatusCodes.OK, {
      data: { ngn, usd, fee, settlementAmount }
    })
  }

  @Get('/transfer')
  @Roles(Role.user)
  async getReceiver(
    @Res() res: Response,
    @Body() body: GetReceiverDTO,
  ) {
    await this.walletService.getReceiver(res, body)
  }

  @Post('/transfer/:receiverId')
  @Roles(Role.user)
  async initiateLocalTransfer(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: TxSourceDTO,
    @Body() body: InitiateLocalTransferDTO,
    @Param('receiverId') receiverId: string,
  ) {
    await this.walletService.initiateLocalTransfer(req, res, receiverId, query, body)
  }
}
