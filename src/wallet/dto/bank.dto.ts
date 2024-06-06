import { ApiProperty } from '@nestjs/swagger'
import {
    IsNotEmpty, IsOptional, IsString, Matches
} from 'class-validator'
import { OtpDto } from 'src/auth/dto/password-auth.dto'

export class BankDetailsDTO extends OtpDto {
    @ApiProperty({
        example: '0N1U2B3A4N'
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{10}$/, {
        message: 'Account number must be a 10-digit number'
    })
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
        example: '0N1U2B3A4N'
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{10}$/, {
        message: 'Account number must be a 10-digit number'
    })
    account_number: string
}