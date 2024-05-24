import { JwtService } from '@nestjs/jwt'
import { Response, Request } from 'express'
import { StatusCodes } from 'enums/StatusCodes'
import { titleText } from 'helpers/transformer'
import { PrismaService } from 'prisma/prisma.service'
import { LoginDto, RegisterDto } from './dto/auth.dto'
import { ResponseService } from 'lib/response.service'
import { HttpException, Injectable } from '@nestjs/common'
import { EncryptionService } from 'lib/encryption.service'

@Injectable()
export class ModminService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly response: ResponseService,
        private readonly encryptionService: EncryptionService,
    ) { }

    private async generateToken({ sub, role }: JwtPayload): Promise<string> {
        return await this.jwtService.signAsync({ sub, role })
    }

    async register(
        res: Response,
        { email, password, fullName, registrationKey }: RegisterDto
    ) {
        try {
            fullName = titleText(fullName)
            const decodedKey = atob(registrationKey as string)
            if (decodedKey !== process.env.ADMIN_REGISTRATION_KEY) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Invalid registration key')
                return
            }

            const modmins = await this.prisma.modmin.count()
            if (modmins === 10) {
                this.response.sendError(res, StatusCodes.Forbidden, "Maximum moderators reached.")
                return
            }

            const modmin = await this.prisma.modmin.findUnique({
                where: { email }
            })

            if (modmin) {
                this.response.sendError(res, StatusCodes.Conflict, `Warning! Existing ${modmin.role}`)
                return
            }

            password = await this.encryptionService.hash(password)

            await this.prisma.modmin.create({
                data: { email, fullName, password }
            })

            this.response.sendSuccess(res, StatusCodes.Created, { message: "You're now a Moderator!" })
        } catch {
            this.handleError()
        }
    }

    async login(
        res: Response,
        { email, password }: LoginDto
    ) {
        try {
            const modmin = await this.prisma.modmin.findUnique({ where: { email } })
            if (!modmin) {
                this.response.sendError(res, StatusCodes.NotFound, 'Warning! Invalid email or password')
                return
            }

            const isMatch = await this.encryptionService.compare(password, modmin.password)

            if (!isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Incorrect Password')
                return
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                access_token: await this.generateToken({
                    sub: modmin.id,
                    role: modmin.role,
                })
            })
        } catch {
            this.handleError()
        }
    }

    async assignAdmin(
        res: Response,
    ) {

    }

    async assignModerator() {

    }

    handleError(err?: any) {
        throw new HttpException('Something went wrong', StatusCodes.InternalServerError)
    }
}
