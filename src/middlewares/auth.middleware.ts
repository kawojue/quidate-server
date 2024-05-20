import { JwtService } from '@nestjs/jwt'
import { NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

export class CustomAuthMiddlware implements NestMiddleware {
    constructor(private readonly jwtService: JwtService) { }

    private async validateAndDecodeToken(token: string) {
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET
            })
        } catch {
            return null
        }
    }

    async use(req: Request, res: Response, next: NextFunction) {
        let sub: string | null = null
        let role: string | null = null

        const authHeader = req.headers.authorization
        if (authHeader) {
            const token = authHeader.split(' ')[1]
            if (token) {
                const decodedToken = await this.validateAndDecodeToken(token)
                if (decodedToken) {
                    sub = decodedToken.sub
                    role = decodedToken.role
                }
            }
        }

        if (sub) {
            req.user = { sub, role }
        }

        next()
    }
}