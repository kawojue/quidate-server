import { Mutex } from 'async-mutex'
import { PrismaService } from 'prisma/prisma.service'
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'

@Injectable()
export class Consumer {
    readonly axiosInstance: AxiosInstance
    private readonly tokenMutex = new Mutex()

    constructor(baseURL: string, private readonly prisma: PrismaService) {
        this.axiosInstance = axios.create({
            baseURL,
            headers: {
                'Accept': 'application/com.reloadly.giftcards-v1+json',
                'Content-Type': 'application/json',
            },
        })
    }

    private async getAccessToken() {
        return await this.prisma.cache.findFirst({
            where: {
                type: 'RELOADLY',
                key: process.env.RELOADLY_CLIENT_ID
            }
        })
    }

    private setAuthorizationHeader(access_token: string) {
        this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${access_token}`
    }

    private async refreshAccessToken() {
        const release = await this.tokenMutex.acquire()
        try {
            let token = await this.getAccessToken()
            if (token && Date.now() < (new Date(token.updatedAt).getTime() + token.expires_in * 1000)) {
                return token.access_token
            }

            const response: AxiosResponse<ReloadlyResponse> = await axios.post(
                'https://auth.reloadly.com/oauth/token',
                {
                    grant_type: 'client_credentials',
                    client_id: process.env.RELOADLY_CLIENT_ID,
                    client_secret: process.env.RELOADLY_CLIENT_SECRET,
                    audience: 'https://giftcards-sandbox.reloadly.com'
                }
            )

            const { expires_in, access_token: newAccessToken, token_type, scope } = response.data

            await this.prisma.cache.upsert({
                where: { key: process.env.RELOADLY_CLIENT_ID },
                create: {
                    scope,
                    token_type,
                    expires_in,
                    type: 'RELOADLY',
                    access_token: newAccessToken,
                    key: process.env.RELOADLY_CLIENT_ID,
                },
                update: {
                    scope,
                    token_type,
                    expires_in,
                    access_token: newAccessToken,
                }
            })

            return newAccessToken
        } finally {
            release()
        }
    }

    async sendRequest<T>(method: Method, url: string, data?: any): Promise<T> {
        try {
            let token = await this.getAccessToken()
            let access_token = token?.access_token

            const tokenExpired = !access_token || (token?.expires_in && Date.now() > (new Date(token.updatedAt).getTime() + token.expires_in * 1000 - 60 * 1000))

            if (tokenExpired) {
                access_token = await this.refreshAccessToken()
            }

            this.setAuthorizationHeader(access_token)

            const response: AxiosResponse<T> = await this.axiosInstance.request({ method, url, data })
            return response.data
        } catch (error) {
            if (error.response) {
                throw new HttpException(error.response.data, error.response.status)
            } else {
                throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR)
            }
        }
    }
}