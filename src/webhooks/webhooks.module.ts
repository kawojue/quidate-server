import { Module } from '@nestjs/common'
import { MiscService } from 'lib/misc.service'
import { WebhooksService } from './webhooks.service'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { BitPowrSdkService } from 'lib/bitPowr.service'
import { WehbooksController } from './webhooks.controller'

@Module({
  controllers: [WehbooksController],
  providers: [
    WebhooksService,
    MiscService,
    PrismaService,
    ResponseService,
    BitPowrSdkService,
  ],
})
export class WehbooksModule { }
