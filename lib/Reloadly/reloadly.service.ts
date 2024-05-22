import { PrismaService } from 'prisma/prisma.service'
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { Injectable, HttpException, HttpStatus } from '@nestjs/common'

@Injectable()
export class Consumer {
    readonly axiosInstance: AxiosInstance

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
        const cache = await this.prisma.cache.findFirst()

        if (!cache) return null

        const { access_token, expires_in, updatedAt } = cache

        return { access_token, expires_in, updatedAt }
    }

    private setAuthorizationHeader(access_token: string) {
        this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${access_token}`
    }

    async sendRequest<T>(method: Method, url: string, data?: any): Promise<T> {
        try {
            const token = await this.getAccessToken()

            let access_token = token?.access_token

            if (
                !token?.access_token ||
                (token?.expires_in && Date.now() > (new Date(token.updatedAt).getTime() + token.expires_in * 1000))
            ) {
                const response: AxiosResponse<Reloadly> = await axios.post(
                    'https://auth.reloadly.com/oauth/token',
                    {
                        client_id: process.env.RELOADLY_CLIENT_ID,
                        client_secret: process.env.RELOADLY_CLIENT_SECRET,
                        grant_type: 'client_credentials',
                        audience: 'https://giftcards-sandbox.reloadly.com'
                    }
                )

                const { expires_in, access_token: accessToken, token_type, scope } = response.data

                access_token = accessToken

                await this.prisma.cache.upsert({
                    where: { key: process.env.RELOADLY_CLIENT_ID },
                    create: {
                        scope,
                        token_type,
                        expires_in,
                        access_token,
                        key: process.env.RELOADLY_CLIENT_ID,
                    },
                    update: {
                        scope,
                        token_type,
                        expires_in,
                        access_token,
                    }
                })
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