import { Response } from 'express'
import { JwtService } from '@nestjs/jwt'
import { USER_REGEX } from 'utils/regExp'
import { Injectable } from '@nestjs/common'
import { StatusCodes } from 'enums/statusCodes'
import { TransactionCurrency } from '@prisma/client'
import { ResponseService } from './response.service'
import { PriceConversionService } from './price-conversion'

@Injectable()
export class MiscService {
    private jwtService: JwtService
    private response: ResponseService
    private priceConversion: PriceConversionService

    constructor() {
        this.jwtService = new JwtService()
        this.response = new ResponseService()
        this.priceConversion = new PriceConversionService()
    }

    async generateNewAccessToken({ sub, role, userStatus }: JwtPayload) {
        return await this.jwtService.signAsync({ sub, role, userStatus })
    }

    validateUsername(username: string) {
        return USER_REGEX.test(username)
    }

    handleServerError(res: Response, err?: any, msg?: string) {
        console.error(err)
        return this.response.sendError(res, StatusCodes.InternalServerError, msg || err?.message || 'Something went wrong')
    }

    handlePaystackAndServerError(res: Response, err: any) {
        if (err.response?.message) {
            console.error(err)
            this.response.sendError(res, err.status, err.response.message)
        } else {
            this.handleServerError(res, err)
        }
    }

    async validateAndDecodeToken(token: string) {
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET
            })
        } catch (err) {
            console.error(err)
            return null
        }
    }

    async calculateCryptoFiatFee(amount: number) {
        const cappedAmount = 100 as const
        const feeRate = 0.1 as const
        let fee = (feeRate / 100) * amount

        if (fee > cappedAmount) {
            fee = cappedAmount
        }

        return {
            processingFee: fee,
            totalFee: fee,
        }
    }

    calculateUSDFee(amount: number) {
        const CAPPED = 2 as const
        let fee = (0.1 / 100) * amount

        if (fee > CAPPED) {
            fee = CAPPED
        }

        return fee
    }

    async calculateFees(amount: number, tx_source: TransactionCurrency): Promise<Fee> {
        const amountInNGN = tx_source === 'NGN' ? amount : (await this.priceConversion.convert_currency(amount, 'USD_TO_NGN')).price
        const processingFee = tx_source === 'NGN' ? 15 : this.calculateUSDFee(amount) + (await this.priceConversion.convert_currency(15, 'NGN_TO_USD')).price
        let paystackFee: number

        if (amountInNGN <= 5_000) {
            paystackFee = tx_source === 'NGN' ? 10 : (await this.priceConversion.convert_currency(10, 'NGN_TO_USD')).price
        } else {
            const paystackFeeAmount = amountInNGN <= 50_000 ? 25 : 50
            paystackFee = tx_source === 'NGN' ? paystackFeeAmount : (await this.priceConversion.convert_currency(paystackFeeAmount, 'NGN_TO_USD')).price
        }

        const totalFee = processingFee + paystackFee

        return { processingFee, paystackFee, totalFee }
    }
}