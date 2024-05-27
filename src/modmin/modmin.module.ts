import { Module } from '@nestjs/common'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { ModminService } from './modmin.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { ModminController } from './modmin.controller'
import { BitPowrSdkService } from 'lib/bitPowr.service'
import { EncryptionService } from 'lib/encryption.service'
import { PriceConversionService } from 'lib/price-conversion'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule],
  controllers: [ModminController],
  providers: [
    ModminService,
    MiscService,
    PrismaService,
    ResponseService,
    EncryptionService,
    BitPowrSdkService,
    PriceConversionService,
  ],
})
export class ModminModule { }
