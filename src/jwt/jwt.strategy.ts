import { Request } from 'express'
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    return request.headers.authorization?.replace('Bearer ', '')
                },
                ExtractJwt.fromUrlQueryParameter('token'),
                ExtractJwt.fromBodyField('token'),
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        })
    }

    async validate(payload: any) {
        return payload
    }
}