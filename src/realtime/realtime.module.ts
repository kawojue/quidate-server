import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { JwtModule } from 'src/jwt/jwt.module'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'prisma/prisma.service'
import { RealtimeService } from './realtime.service'
import { RealtimeGateway } from './realtime.gateway'
import { ResponseService } from 'lib/response.service'

@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  providers: [
    RealtimeGateway,
    JwtService,
    PrismaService,
    RealtimeService,
    ResponseService,
  ],
})
export class RealtimeModule { }
