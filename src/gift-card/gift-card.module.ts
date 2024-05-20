import { PrismaService } from 'prisma'
import { Module } from '@nestjs/common'
import { JwtModule } from 'src/jwt/jwt.module'
import { PlunkService } from 'lib/plunk.service'
import { PassportModule } from '@nestjs/passport'
import { GiftCardService } from './gift-card.service'
import { ResponseService } from 'lib/response.service'
import { GiftCardController } from './gift-card.controller'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule],
  controllers: [GiftCardController],
  providers: [GiftCardService, PrismaService, ResponseService, PlunkService],
})
export class GiftCardModule { }
