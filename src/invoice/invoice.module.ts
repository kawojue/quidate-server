import { Module } from '@nestjs/common'
import { JwtModule } from 'src/jwt/jwt.module'
import { PlunkService } from 'lib/plunk.service'
import { PassportModule } from '@nestjs/passport'
import { InvoiceService } from './invoice.service'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { BitPowrSdkService } from 'lib/bitPowr.service'
import { InvoiceController } from './invoice.controller'
import { PriceConversionService } from 'lib/price-conversion'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule],
  controllers: [InvoiceController],
  providers: [
    InvoiceService, BitPowrSdkService, ResponseService,
    PriceConversionService, PrismaService, PlunkService,
  ],
})
export class InvoiceModule { }
