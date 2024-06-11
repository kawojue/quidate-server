import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { TransactionCurrency } from '@prisma/client'
import { toLowerCase, toUpperCase } from 'helpers/transformer'
import {
    IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min
} from 'class-validator'

enum SortBy {
    name = "name",
    date = "date"
}

export class SearchDto {
    @ApiProperty({
        example: ' '
    })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => toLowerCase(value))
    search: string
}

export class InfiniteScrollDto extends SearchDto {
    @ApiProperty({
        example: 1
    })
    @IsOptional()
    page: number

    @ApiProperty({
        example: 100
    })
    @IsOptional()
    limit: number
}

export class FetchDTO extends InfiniteScrollDto {
    @ApiProperty({
        enum: SortBy
    })
    @IsOptional()
    @IsEnum(SortBy)
    sortBy: SortBy
}

export class FetchProductsDto extends InfiniteScrollDto {
    @IsString()
    @IsOptional()
    @Transform(({ value }) => toUpperCase(value))
    isoName: string
}

export class FXRateDTO {
    @ApiProperty({
        enum: TransactionCurrency
    })
    @IsNotEmpty()
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
    @Min(1)
    @IsNumber()
    @IsNotEmpty()
    quantity: number

    @ApiProperty({
        example: 12.99
    })
    @IsNumber()
    @IsNotEmpty()
    unitPrice: number

    @ApiProperty({
        enum: TransactionCurrency
    })
    @IsEnum(TransactionCurrency)
    tx_source: TransactionCurrency

    @ApiProperty({
        example: 'alwaysappear@gmail.com'
    })
    @IsEmail()
    @IsOptional()
    @Transform(({ value }) => toLowerCase(value))
    recipientEmail: string
}