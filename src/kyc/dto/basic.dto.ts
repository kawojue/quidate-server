import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { titleText } from 'helpers/transformer'
import { IsEnum, IsNotEmpty, IsString } from 'class-validator'

enum MeansOfID {
    NIN = "NIN",
    BVN = "BVN",
    Passport = "Passport",
    DriverLicense = "DriverLicense"
}

export class CountryDTO {
    @ApiProperty({
        example: 'Nigeria'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => titleText(value))
    country: string
}

export class BasicKycDTO extends CountryDTO {
    @ApiProperty({
        example: 'A23-B45-C79'
    })
    @IsString()
    @IsNotEmpty()
    id_no: string

    @ApiProperty({
        enum: MeansOfID
    })
    @IsEnum(MeansOfID)
    @IsNotEmpty()
    means_of_id: MeansOfID

    @ApiProperty({
        type: Array<Express.Multer.File>
    })
    proof_of_id: Array<Express.Multer.File>
}