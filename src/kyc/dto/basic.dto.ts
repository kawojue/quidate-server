import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsString } from 'class-validator'

enum MeansOfID {
    NIN = "NIN",
    BVN = "BVN",
    Passport = "Passport",
    DriverLicense = "DriverLicense"
}

export class BasicKycDTO {
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