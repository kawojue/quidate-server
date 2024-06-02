import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UtilityKycDTO {
    @ApiProperty({
        example: 'My landmark is around my house. Trust me, bro..'
    })
    @IsString()
    @IsOptional()
    additional_notes: string
}