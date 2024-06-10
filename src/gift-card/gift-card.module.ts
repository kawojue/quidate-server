import { Module } from '@nestjs/common'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { PlunkService } from 'lib/plunk.service'
import { PassportModule } from '@nestjs/passport'
import { GiftCardService } from './gift-card.service'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { GiftCardController } from './gift-card.controller'
import { PriceConversionService } from 'lib/price-conversion'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule],
  controllers: [GiftCardController],
  providers: [
    GiftCardService,
    MiscService,
    PlunkService,
    PrismaService,
    ResponseService,
    PriceConversionService,
  ],
})
export class GiftCardModule { }
