import { IsString } from 'class-validator'
import { EmailDto } from './create-auth.dto'
import { ApiProperty } from '@nestjs/swagger'


export class LoginAuthDto extends EmailDto {
    @ApiProperty({
        example: 'Mypswd123',
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