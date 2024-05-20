import { PrismaService } from 'prisma'
import { UAParser } from 'ua-parser-js'
import { JwtService } from '@nestjs/jwt'
import { formatSize } from 'helpers/transformer'
import { getIpAddress } from 'helpers/getIpAddress'
import { NextFunction, Request, Response } from 'express'
import { Injectable, NestMiddleware } from '@nestjs/common'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async validateAndDecodeToken(token: string) {
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: process.env.HANDLE_ENCRYPTION_KEY
            })
        } catch (err) {
            return
        }
    }

    async use(req: Request, res: Response, next: NextFunction) {
        const startTime = process.hrtime()
        const method = req.method
        const remoteAddr = getIpAddress(req)
        const userAgent = req.headers['user-agent']
        const originalUrl = req.originalUrl
        const splitOriginalUrl = originalUrl?.split("?")
        const endpoint = splitOriginalUrl[0]
        const query = splitOriginalUrl.length > 1 ? splitOriginalUrl[1] : undefined
        const url = `${req.protocol}://${req.headers.host}${originalUrl}`

        const log = {
            query,
            method,
            endpoint,
            userAgent,
            full_url: url,
            ip: remoteAddr,
            requestedAt: new Date()
        } as Log

        let decodedToken: any
        if (req.headers.authorization) {
            const token = req.headers.authorization.replace('Bearer ', '')
            decodedToken = await this.validateAndDecodeToken(token)
        }

        res.on('finish', async () => {
            let elapsedTimeDuration: string
            const endTime = process.hrtime(startTime)
            const elapsedTimeInSeconds = (endTime[0] * 1000 + endTime[1] / 1e6) / 1000
            if (elapsedTimeInSeconds < 1) {
                elapsedTimeDuration = `${(elapsedTimeInSeconds * 1000).toFixed(2)}ms`
            } else {
                elapsedTimeDuration = `${elapsedTimeInSeconds.toFixed(2)}s`
            }

            log.responsedAt = new Date()
            log.statusCode = res.statusCode
            log.elapsedTimeDuration = elapsedTimeDuration

            if (log.statusCode != 304) {
                try {
                    const requestSize = req.get('Content-Length') || 0
                    const responseSize = res.getHeader('Content-Length') || 0

                    log.requestSize = formatSize(Number(requestSize))
                    log.responseSize = formatSize(Number(responseSize))

                    const parser = new UAParser(userAgent).getResult()

                    log.os = parser?.os?.name
                    log.device = parser?.device?.model
                    log.browser = parser?.browser?.name
                    log.deviceType = parser?.device?.type

                    if (decodedToken?.sub && decodedToken?.role) {
                        const id = decodedToken.sub

                        if (decodedToken.role === 'user') {
                            await this.prisma.log.create({
                                data: { ...log, user: { connect: { id } } }
                            })
                        } else {
                            await this.prisma.log.create({
                                data: { ...log, modmin: { connect: { id } } }
                            })
                        }
                    } else {
                        await this.prisma.log.create({ data: log })
                    }
                } catch (err) {
                    console.error(err)
                }
            }
        })
        next()
    }
}