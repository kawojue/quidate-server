import { ApiProperty } from '@nestjs/swagger'

export class RcptDto {
    @ApiProperty({
        example: 5,
        default: 1,
        description: 'The page number. This is optional and default is 1'
    })
    page?: number

    @ApiProperty({
        example: 32,
        default: 20,
        description: 'The limit per page. This is optional and default is 20'
    })
    limit?: number
}

export class RecipientDto extends RcptDto {
    @ApiProperty({
        example: 'Kawojue',
        default: '',
        description: 'This is a search query. It\'s optional.'
    })
    search?: string
}