import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class RegisterDto {
    @IsNotEmpty()
    @IsString()
    fullName: string

    @IsNotEmpty()
    @IsString()
    password: string

    @IsNotEmpty()
    @IsString()
    registrationKey: string

    @IsEmail()
    @IsNotEmpty()
    email: string
}

export class LoginDto {
    @IsEmail()
    @IsNotEmpty()
    email: string

    @IsNotEmpty()
    @IsString()
    password: string
}