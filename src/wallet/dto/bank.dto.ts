import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class BankDetailsDTO {
    @ApiProperty({
        example: '0N1U2B3A4N'
    })
    @IsString()
    @IsNotEmpty()
    accountNumber: string

    @ApiProperty({
        example: '004'
    })
    @IsOptional()
    @IsString()
    bankCode: string
}

export class ValidateBankDTO {
    @ApiProperty({
        example: '044',
        description: 'The Code of the Bank the user selected'
    })
    @IsString()
    @IsNotEmpty()
    bank_code: string

    @ApiProperty({
        example: '1234567890',
        description: 'The Account number for the user.'
    })
    @IsString()
    @MinLength(10, {
        message: 'Account number must be at least 10 digits'
    })
    @MaxLength(10, {
        message: 'Account must be at most 10 digits'
    })
    @IsNotEmpty()
    account_number: string
}