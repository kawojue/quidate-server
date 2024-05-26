import { ApiProperty } from '@nestjs/swagger'
import { TransactionCurrency } from '@prisma/client'
import {
    IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString
} from 'class-validator'

export class SearchDto {
    @ApiProperty({
        example: ' '
    })
    @IsString()
    @IsOptional()
    search: string
}

export class InfiniteScrollDto extends SearchDto {
    @ApiProperty({
        example: 1
    })
    @IsOptional()
    page: number

    @ApiProperty({
        example: 50
    })
    @IsOptional()
    limit: number
}

export class FetchProductsDto extends InfiniteScrollDto {
    @IsString()
    @IsOptional()
    isoName: string
}

export class FXRateDTO {
    @ApiProperty({
        enum: TransactionCurrency
    })
    @IsNotEmpty()
    @IsEnum(TransactionCurrency)
    currencyCode: TransactionCurrency

    @ApiProperty({
        example: 20
    })
    @IsNotEmpty()
    amount: number
}

export class PurchaseGiftCardDTO {
    @ApiProperty({
        example: 2
    })
    @IsNumber()
    @IsNotEmpty()
    quantity: number

    @ApiProperty({
        example: '123'
    })
    @IsNumber()
    @IsNotEmpty()
    productId: number

    @ApiProperty({
        example: 12.99
    })
    @IsNumber()
    @IsNotEmpty()
    unitPrice: number
}