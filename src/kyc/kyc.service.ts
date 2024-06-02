import { Response } from 'express'
import { LeveLName } from '@prisma/client'
import { Injectable } from '@nestjs/common'
import { BasicKycDTO } from './dto/basic.dto'
import { MiscService } from 'lib/misc.service'
import { StatusCodes } from 'enums/statusCodes'
import { PlunkService } from 'lib/plunk.service'
import { UtilityKycDTO } from './dto/utility.dto'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import axios, { AxiosError, AxiosResponse } from 'axios'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'
import { normalizePhoneNumber, titleText, toUpperCase } from 'helpers/transformer'

@Injectable()
export class KycService {
    constructor(
        private readonly misc: MiscService,
        private readonly plunk: PlunkService,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
        private readonly cloudinary: CloudinaryService,
    ) { }

    async basicKyc(
        res: Response,
        { sub }: ExpressUser,
        files: Array<Express.Multer.File>,
        { id_no, means_of_id }: BasicKycDTO,
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: sub },
                include: {
                    profile: {
                        select: {
                            phone: true
                        }
                    },
                    level: {
                        select: {
                            name: true,
                        }
                    },
                }
            })

            const kycCount = await this.prisma.kyc.count({
                where: { userId: sub }
            })

            if (kycCount === 2) {
                const pendingKycCount = await this.prisma.kyc.count({
                    where: { userId: sub, verified: false }
                })

                if (pendingKycCount >= 1) {
                    return this.response.sendError(res, StatusCodes.UnprocessableEntity, "Account upgrade in progress")
                } else {
                    return this.response.sendError(res, StatusCodes.Accepted, "Kyc Completed!")
                }
            }

            const isDoneBasicKyc = await this.prisma.kyc.findFirst({
                where: { userId: sub, type: 'BASIC' }
            })

            if (isDoneBasicKyc) {
                if (kycCount === 1) {
                    return this.response.sendError(res, StatusCodes.UnprocessableEntity, "Upgrade your account by uploading a utility bill")
                } else {
                    if (!isDoneBasicKyc.verified) {
                        return this.response.sendError(res, StatusCodes.Conflict, "Document is under review")
                    } else {
                        return this.response.sendError(res, StatusCodes.Accepted, "Account upgraded!")
                    }
                }
            }

            if (means_of_id !== "BVN" && files.length === 0) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Proof of ID is required")
            }

            if (means_of_id === "BVN") {
                let data: {
                    phone: string
                    full_name: string
                }
                await axios.post(
                    "https://api.verified.africa/sfx-verify/v3/id-service/",
                    {
                        searchParameter: id_no,
                        verificationType: "BVN-FULL-DETAILS",
                    },
                    {
                        headers: {
                            userId: process.env.BVN_USER_ID,
                            apiKey: process.env.BVN_API_KEY,
                        },
                    }
                ).then((res: AxiosResponse) => {
                    data = res.data?.response || null
                }).catch((err: AxiosError) => {
                    throw err
                })

                if (!data) {
                    return this.response.sendError(res, StatusCodes.Forbidden, "Invalid BVN provided")
                }

                let matchingNamesCount = 0

                const full_name: string[] = toUpperCase(user.fullName).split(/[\s,]+/).filter(Boolean)
                const bvn_fullName: string[] = toUpperCase(data.full_name).split(/[\s,]+/).filter(Boolean)

                for (const bvn_name of bvn_fullName) {
                    if (full_name.includes(bvn_name)) {
                        matchingNamesCount += 1
                    }
                }

                let percentage = matchingNamesCount * 25

                if (percentage < 50) {
                    return this.response.sendError(res, StatusCodes.Unauthorized, "Profiles not matched")
                }

                if (data?.phone) {
                    for (const tel of data.phone) {
                        const normalizedTel = normalizePhoneNumber(tel)
                        for (const profileTel of user.profile.phone) {
                            const normalizedProfileTel = normalizePhoneNumber(profileTel)
                            if (normalizedTel.endsWith(normalizedProfileTel) || normalizedProfileTel.endsWith(normalizedTel)) {
                                percentage += 5
                                break
                            }
                        }
                    }
                }

                const verified = percentage >= 80
                if (!verified) {
                    return this.response.sendError(res, StatusCodes.Unauthorized, "Profiles not matched")
                }

                const currentLevel = user.level.name
                let newLevelName: LeveLName = 'TIER_2'

                if (currentLevel === 'TIER_2') {
                    newLevelName = 'TIER_3'
                }

                const newLevel = await this.prisma.level.findUnique({
                    where: { name: newLevelName },
                })

                await this.prisma.$transaction([
                    this.prisma.user.update({
                        where: { id: user.id },
                        data: {
                            fullName: titleText(data.full_name),
                            level: {
                                connect: { id: newLevel.id },
                            },
                        },
                    }),
                    this.prisma.kyc.create({
                        data: {
                            means_of_id, id_no: id_no,
                            type: 'BASIC', verified: false,
                            user: { connect: { id: sub } },
                        }
                    })
                ])

                res.on('finish', async () => {
                    await this.prisma.$transaction([
                        this.prisma.recipient.updateMany({
                            where: { fullname: user.fullName },
                            data: {
                                fullname: titleText(data.full_name),
                            },
                        }),
                        this.prisma.notification.create({
                            data: {
                                title: 'Account Upgrade!',
                                description: `Your account has now been upgraded to ${newLevelName}`,
                                user: { connect: { id: user.id } },
                            },
                        }),
                    ])
                })

                this.response.sendSuccess(res, StatusCodes.Created, { message: "Successful" })
            }

            if (files.length > 2) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Only the front and bank of the ID is required")
            }

            let proof_of_ids: Attachment[] = []

            try {
                const promises = files.map(async file => {
                    const MAX_SIZE = 5 << 20
                    const allowedExtensions = ['jpg', 'jpeg', 'png']

                    if (file.size > MAX_SIZE) {
                        return this.response.sendError(res, StatusCodes.PayloadTooLarge, `${file.originalname} is too large`)
                    }

                    if (!allowedExtensions.includes(file.filename.split('.').pop())) {
                        return this.response.sendError(res, StatusCodes.UnsupportedContent, `${file.originalname} is not allowed`)
                    }

                    const upload = await this.cloudinary.upload(file, {
                        folder: `Quidate/KYC/${user.id}`,
                        resource_type: 'image'
                    })

                    return {
                        public_url: upload.url,
                        public_id: upload.public_id,
                        secure_url: upload.secure_url,
                    }
                })

                proof_of_ids = (await Promise.all(promises)).filter((result): result is Attachment => !!result)
            } catch (err) {
                try {
                    if (proof_of_ids.length) {
                        for (const proof_of_id of proof_of_ids) {
                            if (proof_of_id?.public_id) {
                                await this.cloudinary.delete(proof_of_id.public_id)
                            }
                        }
                    }
                } catch (err) {
                    throw err
                }
            }

            await this.prisma.kyc.create({
                data: {
                    means_of_id, id_no: id_no,
                    proof_of_id: proof_of_ids,
                    type: 'BASIC', verified: false,
                    user: { connect: { id: sub } },
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Document has been submitted"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async utilityKyc(
        res: Response,
        { sub }: ExpressUser,
        { additional_notes }: UtilityKycDTO,
        files: Array<Express.Multer.File>,
    ) {
        try {
            const kycCount = await this.prisma.kyc.count({
                where: { userId: sub }
            })

            if (kycCount === 2) {
                const pendingKycCount = await this.prisma.kyc.count({
                    where: { userId: sub, verified: false }
                })

                if (pendingKycCount >= 1) {
                    return this.response.sendError(res, StatusCodes.UnprocessableEntity, "Account upgrade in progress")
                } else {
                    return this.response.sendError(res, StatusCodes.Accepted, "Kyc Completed!")
                }
            }

            const isDoneUtilityKyc = await this.prisma.kyc.findFirst({
                where: { userId: sub, type: 'UTILITY' }
            })

            if (isDoneUtilityKyc) {
                if (kycCount === 1) {
                    return this.response.sendError(res, StatusCodes.UnprocessableEntity, "Upgrade your account by uploading your documents")
                } else {
                    if (!isDoneUtilityKyc.verified) {
                        return this.response.sendError(res, StatusCodes.Conflict, "Document is under review")
                    } else {
                        return this.response.sendError(res, StatusCodes.Accepted, "Account upgraded!")
                    }
                }
            }

            if (files.length > 2) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Only the front and bank of the ID is required")
            }

            let proof_of_ids: Attachment[] = []

            try {
                const promises = files.map(async file => {
                    const MAX_SIZE = 5 << 20
                    const allowedExtensions = ['jpg', 'jpeg', 'png']

                    if (file.size > MAX_SIZE) {
                        return this.response.sendError(res, StatusCodes.PayloadTooLarge, `${file.originalname} is too large`)
                    }

                    if (!allowedExtensions.includes(file.filename.split('.').pop())) {
                        return this.response.sendError(res, StatusCodes.UnsupportedContent, `${file.originalname} is not allowed`)
                    }

                    const upload = await this.cloudinary.upload(file, {
                        folder: `Quidate/KYC/${sub}`,
                        resource_type: 'image'
                    })

                    return {
                        public_url: upload.url,
                        public_id: upload.public_id,
                        secure_url: upload.secure_url,
                    }
                })

                proof_of_ids = (await Promise.all(promises)).filter((result): result is Attachment => !!result)
            } catch (err) {
                try {
                    if (proof_of_ids.length) {
                        for (const proof_of_id of proof_of_ids) {
                            if (proof_of_id?.public_id) {
                                await this.cloudinary.delete(proof_of_id.public_id)
                            }
                        }
                    }
                } catch (err) {
                    throw err
                }
            }

            await this.prisma.kyc.create({
                data: {
                    additional_notes,
                    proof_of_id: proof_of_ids,
                    means_of_id: 'UtilityBill',
                    user: { connect: { id: sub } },
                    type: 'UTILITY', verified: false,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: "Document has been submitted"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }
}
