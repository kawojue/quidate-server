import {
    IsEmail,
    Matches,
    IsString,
    MinLength,
    IsNotEmpty,
} from 'class-validator'
import { USER_REGEX } from 'utils/regExp'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { titleText, toLowerCase } from 'helpers/transformer'

export class EmailDto {
    @ApiProperty({
        example: 'kawojue08@gmail.com'
    })
    @IsEmail()
    @IsNotEmpty()
    email: string
}

export class UsernameDto {
    @ApiProperty({
        example: 'kawojue',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(USER_REGEX, {
        message: "Invalid username"
    })
    @Transform(({ value }) => toLowerCase(value))
    username: string
}

export class CreateAuthDto extends UsernameDto {
    @ApiProperty({
        example: 'kawojue08@gmail.com',
    })
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty({ message: 'Email cannot be empty' })
    @Transform(({ value }) => toLowerCase(value))
    email: string

    @ApiProperty({
        example: 'Raheem Kawojue',
    })
    @IsString({ message: 'Full name must be a string' })
    @IsNotEmpty({ message: 'Full name cannot be empty' })
    @Transform(({ value }) => titleText(value))
    fullName: string

    @ApiProperty({
        example: 'Mypswd123',
    })
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*/, {
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 numeric digit',
    })
    @IsNotEmpty({ message: 'Password cannot be empty' })
    password: string

    @ApiProperty({
        example: '8131911964',
    })
    @Matches(/^\d{10}$/, {
        message: "Invalid phone number"
    })
    @IsString()
    @IsNotEmpty()
    phone: string

    @ApiProperty({
        example: "+234"
    })
    @IsString()
    @IsNotEmpty()
    countryCode: string
}