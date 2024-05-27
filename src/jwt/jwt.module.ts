import { Module } from '@nestjs/common'
import { JwtStrategy } from './jwt.strategy'
import { JwtModule as NestJwtModule } from '@nestjs/jwt'

@Module({
    imports: [
        NestJwtModule.register({
            secret: process.env.HANDLE_ENCRYPTION_KEY,
            signOptions: { expiresIn: '1d' },
            global: true,
        }),
    ],
    providers: [JwtStrategy],
    exports: [NestJwtModule],
})
export class JwtModule { }