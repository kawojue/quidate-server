import { CountryDTO } from './basic.dto'
import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UtilityKycDTO extends CountryDTO {
    @ApiProperty({
        example: 'My landmark is around my house. Trust me, bro..'
    })
    @IsString()
    @IsOptional()
    additional_notes: string
}