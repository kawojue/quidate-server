import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class SearchDto {
    @ApiProperty({
        example: ' '
    })
    @IsString()
    @IsOptional()
    search: string
}

export class InfiniteScrollDto extends SearchDto {
    @ApiProperty({
        example: 1
    })
    @IsOptional()
    page: number

    @ApiProperty({
        example: 50
    })
    @IsOptional()
    limit: number
}

export class FetchProductsDto extends InfiniteScrollDto {
    @IsString()
    @IsOptional()
    isoName: string
}