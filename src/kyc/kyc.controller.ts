import { Response } from 'express'
import {
  UploadedFiles, Post, Body, UseGuards,
  Req, Controller, UseInterceptors, Res,
} from '@nestjs/common'
import { Roles } from 'src/role.decorator'
import { KycService } from './kyc.service'
import { AuthGuard } from '@nestjs/passport'
import { BasicKycDTO } from './dto/basic.dto'
import { UtilityKycDTO } from './dto/utility.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AnyFilesInterceptor } from '@nestjs/platform-express'

@ApiTags("KYC")
@ApiBearerAuth()
@Controller('kyc')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class KycController {
  constructor(private readonly kycService: KycService) { }

  @Roles('user')
  @Post('/basic')
  @UseInterceptors(AnyFilesInterceptor({
    limits: { files: 2 }
  }))
  async basicKyc(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: BasicKycDTO,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    await this.kycService.basicKyc(res, req.user, files || [], body)
  }

  @Roles('user')
  @Post('/utility')
  @UseInterceptors(AnyFilesInterceptor({
    limits: { files: 2 }
  }))
  async utilityKyc(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: UtilityKycDTO,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    await this.kycService.utilityKyc(res, req.user, body, files || [])
  }
}
