import {
    IsEmail,
    IsNotEmpty,
    IsPhoneNumber,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator'
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
        description: 'The username for the user.',
    })
    @IsString()
    @MaxLength(23, {
        message: "Username is too long"
    })
    @MinLength(2, {
        message: "Username is too short"
    })
    @IsNotEmpty()
    @Transform(({ value }) => toLowerCase(value))
    username: string
}

export class CreateAuthDto extends UsernameDto {
    @ApiProperty({
        example: 'john.doe@example.com',
        description: 'The email address for the user.',
    })
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty({ message: 'Email cannot be empty' })
    @Transform(({ value }) => toLowerCase(value))
    email: string

    @ApiProperty({
        example: 'John Doe',
        description: 'The full name of the user (First and Last names).',
    })
    @IsString({ message: 'Full name must be a string' })
    @IsNotEmpty({ message: 'Full name cannot be empty' })
    @Transform(({ value }) => titleText(value))
    fullName: string

    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'The password for the user.',
    })
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*/, {
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 numeric digit',
    })
    @IsNotEmpty({ message: 'Password cannot be empty' })
    password: string

    @ApiProperty({
        example: '+2348131911964',
        description: 'The phone number for the user.',
    })
    @IsPhoneNumber("NG", {
        message: "Invalid Phone Number"
    })
    @MinLength(14, {
        message: "Invalid Phone Number"
    })
    @MaxLength(14, {
        message: "Invalid Phone Number"
    })
    phone: string
}