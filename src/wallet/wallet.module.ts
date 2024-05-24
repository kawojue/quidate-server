import { Module } from '@nestjs/common'
import { MiscService } from 'lib/misc.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { WalletService } from './wallet.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { WalletController } from './wallet.controller'
import { BitPowrSdkService } from 'lib/bitPowr.service'
import { PriceConversionService } from 'lib/price-conversion'
import { PaystackService } from 'lib/Paystack/paystack.service'

@Module({
  imports: [JwtModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [WalletController],
  providers: [
    WalletService,
    MiscService,
    PrismaService,
    PaystackService,
    ResponseService,
    BitPowrSdkService,
    PriceConversionService,
  ],
})
export class WalletModule { }
