import { ApiProperty } from '@nestjs/swagger'
import { AssetType, TransactionCurrency, TransactionSource } from '@prisma/client'
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'


export class CreateInvoiceDto {
    @ApiProperty({
        example: 'My Invoice'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(32)
    subject: string

    @ApiProperty({
        enum: TransactionCurrency
    })
    @IsNotEmpty()
    @IsEnum(TransactionCurrency)
    currency: TransactionCurrency

    @ApiProperty({
        example: `Olamide\nThe CTO's house @ Maryland, inside Praise's room`
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(89)
    clientInfo: string

    @ApiProperty({
        enum: AssetType
    })
    @IsOptional()
    @IsEnum(AssetType)
    assetType?: AssetType

    @ApiProperty({
        example: 'Father Francis fried five fishes for five female friends. Anyway, father Francis na simp!'
    })
    @IsOptional()
    @MaxLength(150)
    description?: string

    @ApiProperty({
        example: 'First Bank'
    })
    @IsOptional()
    bankName?: string

    @ApiProperty({
        example: 'Na Ham Na Ham'
    })
    @IsOptional()
    accountName?: string

    @ApiProperty({
        example: '0N1U2B3A4N'
    })
    @IsOptional()
    accountNumber?: string

    @ApiProperty({
        example: '2My33yqJSuAWX5j4Fzw2oXG6cGKS7mfwDrr'
    })
    @IsOptional()
    walletAddress?: string

    @ApiProperty({
        example: '9629114b-f248-407c'
    })
    @IsOptional()
    orderNo?: string

    @ApiProperty({
        enum: TransactionSource
    })
    @IsEnum(TransactionSource)
    paymentType: TransactionSource

    @ApiProperty({
        example: [
            {
                name: 'Rice',
                rate: 50,
                quantity: 4.5,
                amount: 700
            },
            {
                name: 'Beans',
                rate: 40,
                quatity: 2.5,
                amount: 600
            }
        ]
    })
    @IsArray()
    items: Item[]
}