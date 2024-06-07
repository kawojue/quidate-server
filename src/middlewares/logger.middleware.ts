import { UAParser } from 'ua-parser-js'
import { JwtService } from '@nestjs/jwt'
import { formatSize } from 'helpers/transformer'
import { getIpAddress } from 'helpers/getIPAddress'
import { PrismaService } from 'prisma/prisma.service'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { NextFunction, Request, Response } from 'express'
import { HttpException, Injectable, NestMiddleware } from '@nestjs/common'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private prisma: PrismaService
    private jwtService: JwtService
    private rateLimiter = new RateLimiterMemory({
        points: 30,
        duration: 60,
    })

    constructor() {
        this.prisma = new PrismaService()
        this.jwtService = new JwtService()
    }

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
        const url = `${req.protocol}://${req.headers.host}${originalUrl}`
        const query = splitOriginalUrl.length > 1 ? splitOriginalUrl[1] : undefined

        try {
            await this.rateLimiter.consume(remoteAddr)
        } catch (err) {
            console.error(err)
            throw new HttpException('Too Many Requests', 429)
        }

        // const blacklisted = await this.prisma.blacklistedIP.findUnique({
        //     where: { ip: remoteAddr }
        // })

        // if (blacklisted) {
        //     throw new HttpException("Your IP has been blacklisted", 403)
        // }

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