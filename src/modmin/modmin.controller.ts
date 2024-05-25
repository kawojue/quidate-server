import { Response } from 'express'
import { Roles } from '@prisma/client'
import { ApiTags } from '@nestjs/swagger'
import { ModminService } from './modmin.service'
import { Roles as Role } from 'src/role.decorator'
import {
  Body, Controller, Get, Param, Post, Res, ValidationPipe
} from '@nestjs/common'
import { LoginDto, RegisterDto } from './dto/auth.dto'
import { SkipThrottle, Throttle } from '@nestjs/throttler'

@SkipThrottle()
@ApiTags("Mondmin - Moderator & Admin")
@Controller('modmin')
export class ModminController {
  constructor(
    private readonly modminService: ModminService
  ) { }

  @Post('/register')
  async register(@Res() res: Response, @Body(ValidationPipe) body: RegisterDto) {
    return await this.modminService.register(res, body)
  }

  @SkipThrottle({ default: false })
  @Throttle({ default: { ttl: 2 * 60 * 1000, limit: 3 } })
  @Post('/login')
  async login(@Res() res: Response, @Body(ValidationPipe) body: LoginDto) {
    return await this.modminService.login(res, body)
  }

  @Role(Roles.admin, Roles.moderator)
  @Get('/mainwallet/account')
  async fetchAllMainWallets(@Res() res: Response) {
    await this.modminService.fetchAllMainWallets(res)
  }

  @Role(Roles.admin, Roles.moderator)
  @Get('/mainwallet/account/:uid')
  async findMainWalletByAccountId(@Param('uid') uid: string, @Res() res: Response) {
    await this.modminService.findMainWalletByAccountId(res, uid)
  }

  @Role(Roles.admin, Roles.moderator)
  @Get('/address')
  async fetchAllAddresses(@Res() res: Response) {
    await this.modminService.fetchAllAddresses(res)
  }

  @Role(Roles.admin, Roles.moderator)
  @Get('/address/:accountId')
  async fetchAddressesByAccountId(@Res() res: Response, @Param('accountId') accountId: string) {
    await this.modminService.fetchAddressesByAccountId(res, accountId)
  }
}
