import { Transform } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { titleText } from 'helpers/transformer'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { LineNotEmpty, StateCityNotEmpty } from './custom-validator'

export class AddressDTO {
    @ApiProperty({
        example: 'Room 402'
    })
    @IsString()
    @MaxLength(100)
    @LineNotEmpty('line2', {
        message: 'Either line1 or line2 must be provided'
    })
    line1: string

    @ApiProperty({
        example: 'My Street'
    })
    @IsString()
    @MaxLength(100)
    @LineNotEmpty('line1', {
        message: 'Either line1 or line2 must be provided'
    })
    line2: string

    @ApiProperty({
        example: 'United States - No reason am'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => titleText(value))
    country: string

    @ApiProperty({
        example: '106101'
    })
    @IsString()
    @IsNotEmpty()
    postal_code: string

    @ApiProperty({
        example: 'New York City'
    })
    @IsString()
    @MaxLength(50)
    @StateCityNotEmpty('state', {
        message: 'Either city or state must be provided'
    })
    city: string

    @ApiProperty({
        example: 'Lagos State'
    })
    @IsString()
    @MaxLength(50)
    @StateCityNotEmpty('city', {
        message: 'Either city or state must be provided'
    })
    state: string
}