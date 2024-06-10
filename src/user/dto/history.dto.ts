import { RcptDto } from './recipient.dto'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEnum, IsOptional } from 'class-validator'
import { TransactionSource, TransactionType, TransferStatus } from '@prisma/client'

export class TxHistoriesDto extends RcptDto {
    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        default: 0,
        description: 'The starting date. This is optional and could be 0',
    })
    @IsOptional()
    startDate?: string

    @ApiProperty({
        example: '2024-05-02T00:00:00.000Z',
        default: new Date(),
        description: 'The ending date. This is optional and default is current date'
    })
    @IsOptional()
    endDate?: string

    @ApiProperty({
        enum: TransactionSource,
        default: null,
    })
    @IsOptional()
    @IsEnum(TransactionSource)
    source?: TransactionSource

    @ApiProperty({
        enum: TransactionType,
        default: null,
    })
    @IsOptional()
    @IsEnum(TransactionType)
    type?: TransactionType

    @ApiProperty({
        enum: TransferStatus,
        default: null,
    })
    @IsOptional()
    @IsEnum(TransferStatus)
    status?: TransferStatus
}

export class TxAggregateDTO {
    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        default: 0,
        description: 'The starting date. This is optional and could be 0',
    })
    @IsOptional()
    startDate?: string

    @ApiProperty({
        example: '2024-05-02T00:00:00.000Z',
        default: new Date(),
        description: 'The ending date. This is optional and default is current date'
    })
    @IsOptional()
    endDate?: string

    @ApiProperty({
        enum: TransactionSource,
        default: null,
    })
    @IsOptional()
    @IsEnum(TransactionSource)
    source?: TransactionSource

    @ApiProperty({
        enum: TransactionType,
        default: null,
    })
    @IsOptional()
    @IsEnum(TransactionType)
    type?: TransactionType

    @ApiProperty({
        enum: TransferStatus,
        default: null,
    })
    @IsOptional()
    @IsEnum(TransferStatus)
    status?: TransferStatus
}

export class TxHistoryDto {
    @ApiProperty({
        example: '17095485144143simb259ltct1nxq',
        description: 'You could use reference to generally get any individual transaction.'
    })
    @Transform(({ value }) => value.trim())
    ref?: string

    @ApiProperty({
        example: '0xa-1403619452-53a9887c',
        description: 'You could use Idempotency Key to get any individual crypto transaction.'
    })
    @Transform(({ value }) => value.trim())
    idempotencyKey?: string
}