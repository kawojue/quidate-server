import { Module } from '@nestjs/common'
import { UserService } from './user.service'
import { MiscService } from 'lib/misc.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { PassportModule } from '@nestjs/passport'
import { UserController } from './user.controller'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { PriceConversionService } from 'lib/price-conversion'

@Module({
  imports: [JwtModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [UserController],
  providers: [
    UserService,
    MiscService,
    PrismaService,
    ResponseService,
    PriceConversionService,
  ]
})
export class UserModule { }
