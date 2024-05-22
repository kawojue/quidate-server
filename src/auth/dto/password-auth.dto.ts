import {
    IsNotEmpty, IsString,
    MinLength, Matches,
    IsEmail, MaxLength,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdatePasswordDto {
    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'The old password of the user.',
    })
    @IsNotEmpty({
        message: "Old password cannot be empty"
    })
    oldPassword: string

    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'The password for the user.',
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
        description: 'Password confirmation for the user.',
    })
    @IsString()
    password2: string
}

export class OtpDto {
    @ApiProperty({
        example: '001122',
        description: 'The OTP of the user.',
    })
    @IsString()
    @MinLength(6)
    @MaxLength(6)
    @IsNotEmpty({ message: "OTP field  cannot be empty" })
    otp: string
}

export class ResetPasswordDto extends OtpDto {
    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'The password for the user.',
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
        description: 'Password confirmation for the user.',
    })
    @IsString()
    password2: string
}

export class ResendOTPDto {
    @ApiProperty({
        example: 'john.doe@example.com',
        description: 'The email address for the user.',
    })
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty({ message: 'Email cannot be empty' })
    email: string
}