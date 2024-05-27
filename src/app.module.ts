import { JwtService } from '@nestjs/jwt'
import { APP_GUARD } from '@nestjs/core'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'
import { MiscService } from 'lib/misc.service'
import { TaskService } from 'lib/task.service'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { PlunkService } from 'lib/plunk.service'
import { WhoisService } from 'lib/whois.service'
import { AppController } from './app.controller'
import { ScheduleModule } from '@nestjs/schedule'
import { ModminModule } from './modmin/modmin.module'
import { PrismaService } from 'prisma/prisma.service'
import { WalletModule } from './wallet/wallet.module'
import { ResponseService } from 'lib/response.service'
import { ThreatIntelService } from 'lib/threat.service'
import { InvoiceModule } from './invoice/invoice.module'
import { EncryptionService } from 'lib/encryption.service'
import { WehbooksModule } from './webhooks/webhooks.module'
import { GiftCardModule } from './gift-card/gift-card.module'
import { PriceConversionService } from 'lib/price-conversion'
import cloudinaryConfig from './cloudinary/cloudinary.config'
import { CloudinaryModule } from './cloudinary/cloudinary.module'
import { AssetMetadataService } from 'lib/asset-metadata.service'
import { LoggerMiddleware } from './middlewares/logger.middleware'
import { CloudinaryService } from './cloudinary/cloudinary.service'
import { CustomAuthMiddlware } from './middlewares/auth.middleware'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [cloudinaryConfig],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 6000,
        limit: 3,
      }
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    WalletModule,
    ModminModule,
    WehbooksModule,
    GiftCardModule,
    CloudinaryModule,
  ],
  exports: [PrismaService, EncryptionService],
  controllers: [AppController],
  providers: [
    AppService,
    JwtService,
    MiscService,
    TaskService,
    PlunkService,
    WhoisService,
    PrismaService,
    InvoiceModule,
    ResponseService,
    CloudinaryService,
    EncryptionService,
    ThreatIntelService,
    AssetMetadataService,
    PriceConversionService,
    {
      useClass: ThrottlerGuard,
      provide: APP_GUARD,
    }
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*')

    consumer
      .apply(CustomAuthMiddlware)
      .forRoutes({ path: 'invoice/:invoiceId', method: RequestMethod.GET })
  }
}
