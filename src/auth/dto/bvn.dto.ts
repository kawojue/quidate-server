import { ApiProperty } from '@nestjs/swagger'
import {
    IsNotEmpty, IsString, MaxLength, MinLength
} from 'class-validator'

export class BVNDTO {
    @ApiProperty({
        example: '22013456789'
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(11)
    @MinLength(11)
    bvn: string
}