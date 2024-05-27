import { IsEnum } from 'class-validator'
import { AssetType } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'

export class AssetDTO {
    @ApiProperty({
        enum: AssetType
    })
    @IsEnum(AssetType)
    q: AssetType
}