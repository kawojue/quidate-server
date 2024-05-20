import { PrismaService } from 'prisma'
import { JwtService } from '@nestjs/jwt'
import { APP_GUARD } from '@nestjs/core'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'
import { PlunkService } from 'lib/plunk.service'
import { AppController } from './app.controller'
import { ScheduleModule } from '@nestjs/schedule'
import { WalletModule } from './wallet/wallet.module'
import { ResponseService } from 'lib/response.service'
import { EncryptionService } from 'lib/encryption.service'
import { GiftCardModule } from './gift-card/gift-card.module'
import cloudinaryConfig from './cloudinary/cloudinary.config'
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
    WalletModule,
    GiftCardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtService,
    PlunkService,
    PrismaService,
    ResponseService,
    CloudinaryService,
    EncryptionService,
    AssetMetadataService,
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
