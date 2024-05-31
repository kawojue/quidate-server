import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { KycService } from './kyc.service'
import { ConfigService } from '@nestjs/config'
import { MiscService } from 'lib/misc.service'
import { KycController } from './kyc.controller'
import { PlunkService } from 'lib/plunk.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { EncryptionService } from 'lib/encryption.service'
import { PriceConversionService } from 'lib/price-conversion'
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Module({
  imports: [
    JwtModule, CloudinaryModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [KycController],
  providers: [
    KycService,
    MiscService,
    PlunkService,
    PrismaService,
    ConfigService,
    ResponseService,
    EncryptionService,
    CloudinaryService,
    PriceConversionService,
  ],
})
export class KycModule { }
