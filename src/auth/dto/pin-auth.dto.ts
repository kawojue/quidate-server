import { OtpDto } from './password-auth.dto'
import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class PinDto {
    @ApiProperty({
        example: '1234',
        description: 'The Transaction PIN for the user.'
    })
    @IsString()
    @MinLength(4, {
        message: 'Transaction PIN must be at least 4 digits'
    })
    @MaxLength(4, {
        message: 'Transaction PIN must be at most 4 digits'
    })
    pin1: string

    @ApiProperty({
        example: '1234',
        description: 'The Comfirmation Transaction PIN for the user.'
    })
    @MinLength(4, {
        message: 'Transaction PIN must be at least 4 digits'
    })
    @MaxLength(4, {
        message: 'Transaction PIN must be at most 4 digits'
    })
    @IsString()
    pin2: string

    @ApiProperty({
        example: '123456',
    })
    @IsString()
    @MinLength(6)
    @MaxLength(6)
    @IsOptional()
    otp: string
}