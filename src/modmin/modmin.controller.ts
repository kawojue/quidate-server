import { Response } from 'express'
import { ApiTags } from '@nestjs/swagger'
import { ModminService } from './modmin.service'
import { LoginDto, RegisterDto } from './dto/auth.dto'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import { Body, Controller, Post, Res, ValidationPipe } from '@nestjs/common'

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
}
