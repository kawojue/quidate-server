import axios from 'axios'
import { StatusCodes } from 'enums/statusCodes'
import { PrismaService } from 'prisma/prisma.service'
import { HttpException, Injectable } from '@nestjs/common'

@Injectable()
export class AssetMetadataService {
    private prisma: PrismaService

    constructor() {
        this.prisma = new PrismaService
    }

    private supportedAsset = [
        {
            label: 'binancecoin',
            assetType: 'BSC',
        },
        {
            label: 'ethereum',
            assetType: 'ETH',
        },
        {
            label: 'bitcoin',
            assetType: 'BTC',
        },
        {
            label: 'tether',
            assetType: 'USDT',
        },
    ]

    private priceEndpoint = 'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin%2Cethereum%2Cbitcoin%2Ctether&vs_currencies=usd%2Cngn&include_24hr_change=true'

    async fetchPrice() {
        try {
            const { data } = await axios.get(this.priceEndpoint, {
                headers: {
                    'Accept': 'application/json',
                    'x-cg-demo-api-key': process.env.COINGECKO_API_KEY,
                },
            })

            const currentTime = Math.floor(Date.now() / 1000)

            for (const [assetLabel, assetData] of Object.entries(data)) {
                const supportedAsset = this.supportedAsset.find(asset => asset.label === assetLabel)
                if (!supportedAsset) {
                    continue
                }

                const oneHourAgo = currentTime - 3600
                const twentyFourHoursAgo = currentTime - 3600 * 24

                const last1hrPrice = await this.calculatePrice(
                    supportedAsset.assetType,
                    oneHourAgo,
                    currentTime,
                )

                const last24hrPrice = await this.calculatePrice(
                    supportedAsset.assetType,
                    twentyFourHoursAgo,
                    currentTime,
                )

                const asset = assetData as any

                const payload = {
                    label: supportedAsset.label,
                    timestamp1hr: oneHourAgo,
                    timestampCurrent: currentTime,
                    usd_1h_price: last1hrPrice.usd,
                    ngn_1h_price: last1hrPrice.ngn,
                    usd_24h_price: last24hrPrice.usd,
                    ngn_24h_price: last24hrPrice.ngn,
                    timestamp24hr: twentyFourHoursAgo,
                    usd_current_price: asset.usd ?? 0,
                    ngn_current_price: asset.ngn ?? 0,
                    assetType: supportedAsset.assetType,
                    walletId: process.env.COINGECKO_API_KEY,
                    usd_24h_change: asset.usd_24h_change ?? 0,
                    ngn_24h_change: asset.ngn_24h_change ?? 0,
                }

                const existingRecord = await this.prisma.prices.findFirst({
                    where: {
                        assetType: supportedAsset.assetType,
                        walletId: process.env.COINGECKO_API_KEY,
                    }
                })

                if (!existingRecord) {
                    await this.prisma.prices.create({ data: payload })
                } else {
                    await this.prisma.prices.update({
                        where: { id: existingRecord.id },
                        data: payload,
                    })
                }
            }
        } catch (err) {
            console.error(err)
            throw new HttpException(
                'Failed to fetch price data',
                StatusCodes.InternalServerError,
            )
        }
    }

    private async calculatePrice(
        assetType: string,
        startTime: number,
        endTime: number,
    ) {
        try {
            const [startPrice, endPrice] = await Promise.all([
                this.getPriceAtTime(assetType, startTime),
                this.getPriceAtTime(assetType, endTime),
            ])

            const usdChange = endPrice.usd - startPrice.usd
            const ngnChange = endPrice.ngn - startPrice.ngn

            return {
                usd: usdChange,
                ngn: ngnChange,
            }
        } catch (err) {
            console.error(err)
            return { usd: 0, ngn: 0 }
        }
    }

    private async getPriceAtTime(assetType: string, timestamp: number) {
        try {
            const price = await this.prisma.prices.findFirst({
                where: {
                    assetType: assetType,
                    timestampCurrent: {
                        lte: timestamp,
                    },
                },
                orderBy: {
                    timestampCurrent: 'desc',
                },
                select: {
                    usd_current_price: true,
                    ngn_current_price: true,
                },
            })

            const usdPrice = price?.usd_current_price || 0
            const ngnPrice = price?.ngn_current_price || 0

            return {
                usd: usdPrice,
                ngn: ngnPrice,
            }
        } catch (err) {
            console.error(err)
            return { usd: 0, ngn: 0 }
        }
    }
}