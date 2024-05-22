import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { ConfigService } from '@nestjs/config'
import { MiscService } from 'lib/misc.service'
import { PlunkService } from 'lib/plunk.service'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { JwtStrategy } from 'src/jwt/jwt.strategy'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { EncryptionService } from 'lib/encryption.service'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Module({
  imports: [
    JwtModule, CloudinaryModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MiscService,
    JwtStrategy,
    PlunkService,
    PrismaService,
    ConfigService,
    ResponseService,
    PaystackService,
    EncryptionService,
    CloudinaryService,
  ],
})

export class AuthModule { }
