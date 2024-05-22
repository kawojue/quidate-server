import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class ReportDto {
    @ApiProperty({
        example: 'Kyc issues'
    })
    @IsString()
    @IsNotEmpty()
    category: string

    @ApiProperty({
        example: 'Key'
    })
    @IsString()
    @IsOptional()
    subject?: string

    @ApiProperty({
        example: 'It took a very long time to get verified'
    })
    @IsString()
    @IsNotEmpty()
    description: string

    @ApiProperty({
        type: [File],
        description: 'Array of file objects representing attachments'
    })
    @IsOptional()
    attachments?: File[]
}