import { Module } from '@nestjs/common'
import { JwtModule } from 'src/jwt/jwt.module'
import { ModminService } from './modmin.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { ModminController } from './modmin.controller'
import { EncryptionService } from 'lib/encryption.service'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule],
  controllers: [ModminController],
  providers: [ModminService, ResponseService, PrismaService, EncryptionService],
})
export class ModminModule { }
