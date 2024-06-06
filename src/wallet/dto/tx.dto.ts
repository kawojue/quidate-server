import {
    IsNotEmpty, IsNumber, IsOptional,
    IsString, MaxLength, MinLength, IsEnum,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { toLowerCase } from 'helpers/transformer'
import { TransactionCurrency } from '@prisma/client'


export class TxSourceDTO {
    @ApiProperty({
        enum: TransactionCurrency
    })
    @IsEnum(TransactionCurrency)
    tx_source: TransactionCurrency
}

export class GetReceiverDTO {
    @ApiProperty({
        examples: ['kawojue', '+2348131911964', '8131911964', '08131911964']
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(14)
    @Transform(({ value }) => toLowerCase(value))
    phoneOrUsername: string
}

export class AmountDTO {
    @ApiProperty({
        example: 2000.23,
        description: 'The transaction amount'
    })
    @IsNotEmpty()
    amount: number
}

export class InitiateWithdrawalDTO extends AmountDTO {
    @ApiProperty({
        example: '1234',
    })
    @IsString()
    @MinLength(4, {
        message: 'Transaction PIN is at least 4 digits'
    })
    @MaxLength(4, {
        message: 'Transaction PIN is at most 4 digits'
    })
    @IsOptional()
    pin?: string

    @ApiProperty({
        example: 'Normal token sha'
    })
    @IsString()
    @IsOptional()
    biometricToken?: string
}

export class InitiateLocalTransferDTO extends AmountDTO {
    @ApiProperty({
        example: '1234',
    })
    @IsString()
    @MinLength(4, {
        message: 'Transaction PIN is at least 4 digits'
    })
    @MaxLength(4, {
        message: 'Transaction PIN is at most 4 digits'
    })
    @IsOptional()
    pin?: string

    @ApiProperty({
        example: 'Normal token sha'
    })
    @IsString()
    @IsOptional()
    biometricToken?: string

    @ApiProperty({
        example: "food",
        description: "This is optional."
    })
    @MaxLength(32, {
        message: "Description is too long"
    })
    narration?: string
}

export class GetBankNameDTO {
    @ApiProperty({
        example: '044',
        description: 'The bank code for the user'
    })
    @IsString()
    @IsNotEmpty()
    bankCode: string
}

export class FeeDTO extends TxSourceDTO {
    @ApiProperty({
        example: 2000.23,
        description: 'The transaction amount'
    })
    @IsNumber()
    @IsNotEmpty()
    amount: number
}