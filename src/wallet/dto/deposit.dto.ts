import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class FundWalletDTO {
    @ApiProperty({
        example: 'ref-fdknvkdnv-dvkdnv'
    })
    @IsString()
    @IsNotEmpty()
    ref: string
}