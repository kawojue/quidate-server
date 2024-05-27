import { JwtService } from '@nestjs/jwt'
import { Reflector } from '@nestjs/core'
import { PrismaService } from 'prisma/prisma.service'
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const roles = this.reflector.get<string[]>('roles', context.getHandler())
        if (!roles) return true

        const ctx = context.switchToHttp()
        const request = ctx.getRequest()

        const token = request.headers.authorization?.split('Bearer ')[1]
        if (!token) return false

        try {
            const decoded = this.jwtService.verify(token)
            if (decoded?.sub && decoded?.status && decoded?.modelName) {
                const id = decoded.sub
                const status = decoded.status
                const modelName = decoded.modelName

                return (this.prisma[modelName] as any).findUnique({
                    where: { id }
                }).then(res => {
                    if (res.status !== status || res.status !== 'ACTIVE') {
                        return false
                    }
                    request.user = decoded
                    return roles.includes(decoded.role)
                }).catch(() => {
                    return false
                })
            }

            request.user = decoded
            return roles.includes(decoded.role)
        } catch (error) {
            return false
        }
    }
}