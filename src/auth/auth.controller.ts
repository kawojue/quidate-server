import {
  UpdatePasswordDto, OtpDto,
  ResendOTPDto, ResetPasswordDto,
} from './dto/password-auth.dto'
import { Roles } from 'src/role.decorator'
import { PinDto } from './dto/pin-auth.dto'
import { Request, Response } from 'express'
import { ReportDto } from './dto/report.dto'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { AddressDTO } from './dto/address.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import {
  Controller, Post, UseGuards, UploadedFiles, Patch,
  Res, UploadedFile, UseInterceptors, Delete, Body, Req,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import { CreateAuthDto, UsernameDto } from './dto/create-auth.dto'
import { LoginAuthDto, LoginBiometricDto } from './dto/login-auth.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Auth')
@Controller('auth')
@SkipThrottle({ default: true })
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("signup")
  async signup(
    @Req() req: Request,
    @Res() res: Response,
    @Body() createAuthDto: CreateAuthDto
  ) {
    await this.authService.signup(req, res, createAuthDto)
  }

  @SkipThrottle({ default: false })
  @Throttle({ default: { ttl: 60 * 1000, limit: 5 } })
  @Post("/login")
  async login(
    @Res() res: Response,
    @Body() loginAuthDto: LoginAuthDto
  ) {
    await this.authService.login(res, loginAuthDto)
  }

  @Post("/login/biometric")
  async biometricLogin(@Res() res: Response, @Body() { token }: LoginBiometricDto) {
    await this.authService.biometricLogin(res, token)
  }

  @SkipThrottle({ default: false })
  @Throttle({ default: { ttl: 5 * 60 * 1000, limit: 3 } })
  @Post("/otp/verify")
  async verifyOtp(@Res() res: Response, @Body() { otp }: OtpDto) {
    await this.authService.verifyOtp(res, otp)
  }

  @Post("/otp/request")
  async resendOtp(@Res() res: Response, @Body() { email }: ResendOTPDto) {
    await this.authService.resendOTP(res, email)
  }

  @SkipThrottle({ default: false })
  @Throttle({ default: { ttl: 5 * 60 * 1000, limit: 3 } })
  @Post("/password/reset")
  async resetPassword(
    @Req() req: Request,
    @Res() res: Response,
    @Body() resetPasswordDto: ResetPasswordDto
  ) {
    await this.authService.resetPassword(res, req, resetPasswordDto)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('user')
  @Post("/password/edit")
  async updatePassword(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: UpdatePasswordDto
  ) {
    await this.authService.updatePassword(res, req.user, body)
  }

  @Roles('user')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('/address')
  async addAddress(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: AddressDTO
  ) {
    await this.authService.addAddress(res, req.user, body)
  }

  @ApiOperation({
    summary: 'The formdata key should be avatar'
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('user')
  @UseInterceptors(FileInterceptor('avatar'))
  @Post('/avatar')
  async uploadAvatar(
    @Res() res: Response,
    @Req() req: IRequest,
    @UploadedFile() file: Express.Multer.File
  ) {
    const header: FileDest = {
      folder: `QuidateFinance/${req.user.sub}`,
      resource_type: 'image'
    }

    await this.authService.uploadAvatar(res, req.user, file, header)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('user')
  @Patch('/pin/create')
  async createTransactionPin(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() pin: PinDto
  ) {
    await this.authService.createTransactionPin(res, req.user, pin)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('user')
  @Patch('/username')
  async updateUsername(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() username: UsernameDto
  ) {
    await this.authService.updateUsername(res, req.user, username)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('user')
  @Delete('/hehehe')
  async deleteAccount(
    @Res() res: Response,
    @Req() req: IRequest,
  ) {
    await this.authService.deleteAccount(res, req.user)
  }

  @ApiOperation({
    summary: 'The formdata key should be attachments'
  })
  @Post('/report-submission')
  @UseInterceptors(FileInterceptor('attachments'))
  async reportSubmission(
    @Res() res: Response,
    @Body() body: ReportDto,
    @UploadedFiles() attachements: Express.Multer.File[]
  ) {
    await this.authService.reportSubmission(res, attachements || [], body)
  }
}
