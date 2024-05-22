import {
    IsEmail,
    IsString
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'


export class LoginAuthDto {
    @ApiProperty({
        example: 'john.doe@example.com',
        description: 'The email address for the user.',
    })
    @IsString()
    @IsEmail({}, { message: 'Invalid email format' })
    email: string

    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'The password for the user.',
    })
    @IsString()
    password: string
}


export class LoginBiometricDto {
    @ApiProperty({
        example: 'eycvdkvnd.dkvndnvdv.skcnksn',
        description: 'Fingerprint token generated from the client',
    })
    @IsString()
    token: string
}