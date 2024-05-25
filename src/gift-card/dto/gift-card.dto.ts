import {
    IsEnum, IsNotEmpty, IsOptional, IsString
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TransactionCurrency } from '@prisma/client'

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