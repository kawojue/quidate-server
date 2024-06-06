import {
    IsNotEmpty, Matches,
    MinLength, IsString,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdatePasswordDto {
    @ApiProperty({
        example: 'P@ssw0rd1',
    })
    @IsNotEmpty({
        message: "Old password cannot be empty"
    })
    oldPassword: string

    @ApiProperty({
        example: 'P@ssw0rd1',
    })
    @IsString()
    @MinLength(6, {
        message: "Password must be at least 6 characters"
    })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*/, {
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 numeric digit',
    })
    password1: string

    @ApiProperty({
        example: 'P@ssw0rd1',
    })
    @IsString()
    password2: string
}

export class OtpDto {
    @ApiProperty({
        example: '234517'
    })
    @IsString()
    @Matches(/^\d{6}$/, {
        message: 'OTP must be a 4-digit number'
    })
    @IsNotEmpty()
    otp: string
}

export class ResetPasswordDto extends OtpDto {
    @ApiProperty({
        example: 'P@ssw0rd1',
    })
    @IsString()
    @MinLength(6, {
        message: "Password must be at least 6 characters"
    })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*/, {
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 numeric digit',
    })
    password1: string

    @ApiProperty({
        example: 'P@ssw0rd1',
    })
    @IsString()
    password2: string
}