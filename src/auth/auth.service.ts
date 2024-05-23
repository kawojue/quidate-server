import { Request, Response } from 'express'
import { Injectable } from '@nestjs/common'
import { PinDto } from './dto/pin-auth.dto'
import { ReportDto } from './dto/report.dto'
import { MiscService } from 'lib/misc.service'
import { StatusCodes } from 'enums/StatusCodes'
import { generateOTP } from 'helpers/generator'
import { PlunkService } from 'lib/plunk.service'
import { WhoisService } from 'lib/whois.service'
import { getIpAddress } from 'helpers/getIpAddress'
import { LoginAuthDto } from './dto/login-auth.dto'
import { ResponseService } from 'lib/response.service'
import { PrismaService } from 'prisma/prisma.service'
import { EncryptionService } from 'lib/encryption.service'
import { titleText, toLowerCase } from 'helpers/transformer'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { CreateAuthDto, UsernameDto } from './dto/create-auth.dto'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'
import { UpdatePasswordDto, ResetPasswordDto } from './dto/password-auth.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly misc: MiscService,
    private readonly plunk: PlunkService,
    private readonly whois: WhoisService,
    private readonly prisma: PrismaService,
    private readonly response: ResponseService,
    private readonly paystack: PaystackService,
    private readonly encryption: EncryptionService,
    private readonly cloudinary: CloudinaryService,
  ) { }

  async signup(
    req: Request,
    res: Response,
    {
      fullName, username,
      phone, email, password
    }: CreateAuthDto
  ) {
    try {
      email = toLowerCase(email)
      fullName = titleText(fullName)
      username = toLowerCase(username)

      if (!this.misc.validateUsername(username)) {
        return this.response.sendError(res, StatusCodes.BadRequest, "Username is not allowed")
      }

      const findByEmail = await this.prisma.user.findUnique({
        where: { email }
      })

      if (findByEmail) {
        return this.response.sendError(res, StatusCodes.Conflict, "Account with this email already exist")
      }

      const findByPhone = await this.prisma.user.findUnique({
        where: { phone }
      })

      if (findByPhone) {
        return this.response.sendError(res, StatusCodes.Conflict, "Account with this phone number already exist")
      }

      password = await this.encryption.hash(password)

      const ALLOWED_CONTINENTS = ['Africa']
      const ip_info = await this.whois.getInfo(req)
      if (!ALLOWED_CONTINENTS.includes(ip_info.continent)) {
        this.response.sendError(res, StatusCodes.Forbidden, "Your Country is not allowed")
      }

      const user = await this.prisma.user.create({
        data: {
          primaryAsset: 'BTC', username,
          lastPasswordChanged: new Date(),
          fullName, email, password, phone,
        }
      })

      if (user) {
        await this.prisma.ip.create({
          data: {
            ip: ip_info.ip,
            type: ip_info.type,
            city: ip_info.city,
            isEu: ip_info.is_eu,
            region: ip_info.region,
            postal: ip_info.postal,
            capital: ip_info.capital,
            country: ip_info.country,
            borders: ip_info.borders,
            flagImg: ip_info.flag.img,
            latitude: ip_info.latitude,
            longitude: ip_info.longitude,
            continent: ip_info.continent,
            flagEmoji: ip_info.flag.emoji,
            regionCode: ip_info.region_code,
            countryCode: ip_info.country_code,
            callingCode: ip_info.calling_code,
            currencyCode: ip_info.currency.code,
            currencyName: ip_info.currency.name,
            connectionIsp: ip_info.connection.isp,
            connectionOrg: ip_info.connection.org,
            continentCode: ip_info.continent_code,
            connectionAsn: ip_info.connection.asn,
            currencySymbol: ip_info.currency.symbol,
            currencyPlural: ip_info.currency.plural,
            connectionDomain: ip_info.connection.domain,
            flagEmojiUnicode: ip_info.flag.emoji_unicode,
            user: { connect: { id: user.id } }
          }
        })
      }

      res.on('finish', async () => {
        if (user) {
          const otp = generateOTP()

          await Promise.all([
            this.plunk.sendPlunkEmail({
              to: email,
              subject: 'Verify your email',
              body: `otp : ${otp.totp}`
            }),
            this.prisma.totp.create({
              data: {
                otp: otp.totp,
                otp_expiry: otp.totp_expiry,
                user: {
                  connect: { id: user.id }
                }
              },
            }),
          ])

          if (process.env.NODE_ENV !== 'production') {
            console.log(otp.totp)
          }
        }
      })

      this.response.sendSuccess(res, StatusCodes.Created, "Account created successfully")
    } catch (err) {

    }
  }

  async login(
    res: Response,
    req: Request,
    { email, password }: LoginAuthDto
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email: email.toLowerCase().trim()
        },
        include: {
          customer: true,
          virtualAccount: true,
          walletAddresses: true,
        }
      })

      if (!user) {
        this.response.sendError(res, StatusCodes.NotFound, "Invalid Email or Password")
        return
      }

      const verifyPassword = await this.encryption.compare(password, user.password)
      if (!verifyPassword) {
        this.response.sendError(res, StatusCodes.Unauthorized, "Incorrect Password")
        return
      }

      this.response.sendSuccess(res, StatusCodes.OK, {
        access_token: await this.misc.generateNewAccessToken({
          sub: user.id,
          role: user.role,
          userStatus: user.userStatus
        }),
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullname: user.fullName,
          primaryAsset: user.primaryAsset,
          isPinCreated: user.pin !== null,
          email_verified: user.email_verified,
          avatar: user.avatar?.secure_url ?? null,
          bvn_status: this.prisma.bvnStatus(user.customer),
          isCreatedVirtualAccount: user.virtualAccount !== null,
          isAssignedAddresses: user.walletAddresses.length !== 0,
        },
        message: "Login Successful",
      })
    } catch (err) {
      this.misc.handleServerError(res, err)
    }
  }

  async biometricLogin(res: Response, token: string) {
    try {
      const decodedToken = await this.misc.validateAndDecodeToken(token)
      const userId = decodedToken.sub

      const user = await this.prisma.user.findUnique({
        where: {
          id: userId
        },
        include: {
          customer: true,
          virtualAccount: true,
          walletAddresses: true,
        }
      })

      if (!user) {
        this.response.sendError(res, StatusCodes.NotFound, 'Something went wrong')
        return
      }

      this.response.sendSuccess(res, StatusCodes.OK, {
        access_token: await this.misc.generateNewAccessToken({
          sub: user.id,
          role: user.role,
          userStatus: user.userStatus
        }),
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullname: user.fullName,
          primaryAsset: user.primaryAsset,
          isPinCreated: user.pin !== null,
          email_verified: user.email_verified,
          avatar: user.avatar?.secure_url || null,
          bvn_status: this.prisma.bvnStatus(user.customer),
          isCreatedVirtualAccount: user.virtualAccount !== null,
          isAssignedAddresses: user.walletAddresses.length !== 0,
        },
        message: "Login Successful",
      })
    } catch (err) {
      this.misc.handleServerError(res, err, "Biometric login failed")
    }
  }

  async updatePassword(
    res: Response,
    reqUser: ExpressUser,
    { oldPassword, password1, password2 }: UpdatePasswordDto
  ) {
    try {
      const userId = reqUser.sub
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        }
      })

      const verifyPassword = await this.encryption.compare(oldPassword, user.password)

      if (!verifyPassword) {
        this.response.sendError(res, StatusCodes.Unauthorized, "Incorrect password")
        return
      }

      if (password1 !== password2) {
        this.response.sendError(res, StatusCodes.BadRequest, "Passwords do not match")
        return
      }

      const hashedPassword = await this.encryption.hash(password1)

      await this.prisma.user.update({
        where: {
          id: userId
        },
        data: { password: hashedPassword }
      })

      await this.prisma.notification.create({
        data: {
          title: 'Password Update',
          description: 'Your password has been updated successfully',
          user: {
            connect: {
              id: userId
            }
          }
        }
      })

      this.response.sendSuccess(res, StatusCodes.OK, {
        message: "Password has been updated successfully"
      })
    } catch (err) {
      this.misc.handleServerError(res, err, "Error updating password")
    }
  }

  async resendOTP(res: Response, email: string) {
    try {
      let mail: boolean = false
      let eligible: boolean = false
      email = email.trim().toLowerCase()

      const user = await this.prisma.user.findUnique({
        where: { email }
      })

      if (!user) {
        this.response.sendError(res, StatusCodes.NotFound, "Account does not exist")
        return
      }

      const totp = await this.prisma.totp.findUnique({
        where: {
          userId: user.id
        }
      })

      const otp = generateOTP()

      if (totp) {
        if (!totp.otp_expiry) {
          mail = true
          eligible = true
        } else {
          const currentTime = new Date().getTime()
          const totp_expiry = new Date(totp.otp_expiry).getTime()

          const OTP_EXPIRY_THRESHOLD = 2.5 as const
          const remainingMinutes = ((totp_expiry - currentTime) / 1000) / 60

          if (remainingMinutes < OTP_EXPIRY_THRESHOLD) {
            mail = true
            eligible = true
          } else {
            this.response.sendError(res, StatusCodes.Unauthorized, `Request after ${Math.floor(remainingMinutes)} minutues`)
            return
          }
        }
      } else {
        mail = true
        await this.prisma.totp.create({
          data: {
            otp: otp.totp,
            otp_expiry: otp.totp_expiry,
            user: {
              connect: { id: user.id }
            }
          }
        })
      }

      if (eligible) {
        await this.prisma.totp.update({
          where: {
            userId: user.id
          },
          data: {
            otp: otp.totp,
            otp_expiry: otp.totp_expiry
          }
        })
      }

      if (mail) {
        await this.plunk.sendPlunkEmail({
          to: user.email,
          subject: "Verify it is you!",
          body: `Otp: ${otp.totp}`
        })
      }

      this.response.sendSuccess(res, StatusCodes.OK, {
        message: "New OTP has been sent to your email"
      })
    } catch (err) {
      this.misc.handleServerError(res, err, "Sorry, there is a problem on our end")
    }
  }

  async verifyOtp(res: Response, otp: string) {
    try {
      const totp = await this.prisma.totp.findFirst({
        where: { otp }
      })

      if (!totp || !totp.otp_expiry) {
        this.response.sendError(res, StatusCodes.Unauthorized, "Invalid OTP")
        return
      }

      const currentTime = new Date().getTime()
      const otp_expiry = new Date(totp.otp_expiry).getTime()

      if (currentTime > otp_expiry) {
        await this.prisma.totp.update({
          where: {
            id: totp.id
          },
          data: {
            otp: "",
            otp_expiry: ""
          }
        })
        this.response.sendError(res, StatusCodes.Forbidden, "OTP has expired")
        return
      }

      const updatedUser = await this.prisma.user.update({
        where: {
          id: totp.userId
        },
        data: {
          email_verified: true,
        }
      })

      await this.prisma.totp.delete({
        where: {
          userId: updatedUser.id
        }
      })

      this.response.sendSuccess(res, StatusCodes.OK, {
        verified: true,
        message: "Successful",
      })
    } catch (err) {
      this.misc.handleServerError(res, err)
    }
  }

  async resetPassword(
    res: Response,
    req: Request,
    { otp, password1, password2 }: ResetPasswordDto
  ) {
    try {
      if (password1 != password2) {
        this.response.sendError(res, StatusCodes.BadRequest, 'Passwords do not match')
        return
      }

      const totp = await this.prisma.totp.findFirst({
        where: { otp }
      })

      if (!totp || !totp.otp_expiry) {
        this.response.sendError(res, StatusCodes.Unauthorized, 'Invalid OTP')
        return
      }

      const currentTime = new Date().getTime()
      const otp_expiry = new Date(totp.otp_expiry).getTime()

      if (currentTime > otp_expiry) {
        this.response.sendError(res, StatusCodes.Forbidden, "OTP has expired")
        await this.prisma.totp.update({
          where: {
            id: totp.id
          },
          data: {
            otp: "",
            otp_expiry: ""
          }
        })
        return
      }

      const hashedPassword = await this.encryption.hash(password1)

      await this.prisma.user.update({
        where: {
          id: totp.userId
        },
        data: {
          email_verified: true,
          password: hashedPassword
        }
      })

      await this.prisma.totp.delete({
        where: {
          id: totp.id
        }
      })

      await this.prisma.notification.create({
        data: {
          title: 'Password Reset',
          description: `Your password has been reseted successfully. IP Address: ${getIpAddress(req)}`,
          user: {
            connect: {
              id: totp.userId
            }
          }
        }
      })

      this.response.sendSuccess(res, StatusCodes.OK, {
        message: "Password reset was successful"
      })
    } catch (err) {
      this.misc.handleServerError(res, err, "Reset password failed")
    }
  }

  async uploadAvatar(
    res: Response, reqUser: ExpressUser,
    file: Express.Multer.File, header: FileDest,
  ) {
    try {
      const userId = reqUser.sub
      const MAX_SIZE = 5_242_880 as const
      const allowedExt: string[] = ['jpg', 'png']

      if (!file) {
        this.response.sendError(res, StatusCodes.BadRequest, "No file selected")
        return
      }

      if (MAX_SIZE < file.size) {
        this.response.sendError(res, StatusCodes.PayloadTooLarge, "File too large")
        return
      }

      const fileExt = file.originalname.split('.').pop()
      if (!allowedExt.includes(fileExt)) {
        this.response.sendError(res, StatusCodes.UnsupportedContent, "File extension is not allowed")
        return
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      })

      if (user.avatar?.public_id) {
        await this.cloudinary.delete(user.avatar.public_id)
      }

      const response = await this.cloudinary.upload(file, header)

      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          avatar: {
            public_url: response.url,
            public_id: response.public_id,
            secure_url: response.secure_url,
          }
        }
      })

      this.response.sendSuccess(res, StatusCodes.OK, {
        avatar: updatedUser.avatar,
        message: "Avatar has been uploaded successfully"
      })
    } catch (err) {
      console.error(err)
      this.response.sendError(res, StatusCodes.InternalServerError, "Error uploading avatar")
    }
  }

  async createTransactionPin(res: Response, reqUser: ExpressUser, { pin1, pin2, otp }: PinDto) {
    try {
      const userId = reqUser.sub
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId
        },
        include: {
          customer: true
        }
      })

      if (!user) {
        this.response.sendError(res, StatusCodes.NotFound, "Somthing went wrong")
        return
      }

      const isProd = process.env.NODE_ENV === 'production'
      if (isProd) {
        if (!user.email_verified) {
          this.response.sendError(res, StatusCodes.Forbidden, "Verify your email before creating a transaction PIN")
          return
        }

        if (!user.customer.verified) {
          this.response.sendError(res, StatusCodes.Unauthorized, "Complete your KYC verification")
          await this.prisma.notification.create({
            data: {
              title: 'Attempted to Create a Transaction PIN',
              description: 'You need to complete your KYC Verification before creating a Transaction PIN',
              user: {
                connect: {
                  id: user.id
                }
              }
            }
          })
          return
        }
      }

      if (pin1 !== pin2) {
        this.response.sendError(res, StatusCodes.BadRequest, "PINs do not match")
        return
      }

      if (user.pin) {
        const totp = await this.prisma.totp.findFirst({
          where: { otp },
          include: { user: { select: { id: true } } }
        })

        if (!totp) {
          return this.response.sendError(res, StatusCodes.Unauthorized, 'Invalid OTP')
        }

        const otp_expiry = new Date(totp.otp_expiry)
        const expired = new Date() > otp_expiry

        if (expired) {
          this.response.sendError(res, StatusCodes.Forbidden, 'OTP has expired')
          this.prisma.totp.delete({
            where: {
              userId: totp.user.id
            }
          })
          return
        }
      }

      await this.prisma.user.update({
        where: {
          id: userId
        },
        data: {
          pin: await this.encryption.hash(pin1),
        }
      })

      await this.prisma.notification.create({
        data: {
          title: 'Created Transaction PIN',
          description: `You've successfully created a transaction PIN. Your PIN is secured and encrypted.`,
          user: {
            connect: {
              id: userId
            }
          }
        }
      })

      this.response.sendSuccess(res, StatusCodes.OK, {
        message: "Transaction PIN has been created successfully"
      })
    } catch (err) {
      this.misc.handleServerError(res, err, "Sorry, there is a problem on our end")
    }
  }

  async updateUsername(res: Response, reqUser: ExpressUser, { username }: UsernameDto) {
    try {
      const userId = reqUser.sub
      username = username.trim().toLowerCase()

      const user = await this.prisma.user.findUnique({
        where: {
          id: userId
        }
      })

      if (!this.misc.validateUsername(username)) {
        this.response.sendError(res, StatusCodes.BadRequest, "Username is not allowed")
        return
      }

      const existingUsername = await this.prisma.user.findUnique({
        where: { username }
      })

      if (existingUsername) {
        return this.response.sendError(res, StatusCodes.Conflict, "Username has been taken")
      }

      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: { username }
      })

      const localRecipients = await this.prisma.localRecipient.findMany({
        where: { username: user.username }
      })

      if (localRecipients.length > 0) {
        await this.prisma.localRecipient.updateMany({
          where: { username: user.username },
          data: { username }
        })
      }

      await this.prisma.notification.create({
        data: {
          title: 'Username Update',
          description: `Your username will be updated across the app.`,
          user: {
            connect: {
              id: userId
            }
          }
        }
      })

      this.response.sendSuccess(res, StatusCodes.OK, {
        username,
        message: "Username has been updated successfully"
      })
    } catch (err) {
      this.misc.handleServerError(res, err, "Error updating username.")
    }
  }

  async reportSubmission(
    res: Response,
    attachments: Express.Multer.File[],
    { category, description, subject }: ReportDto,
  ) {
    try {
      if (attachments.length > 3) {
        return this.response.sendError(res, StatusCodes.BadRequest, 'Only a maximum of three files is allowed')
      }

      let filesArray = [] as Attachment[]
      if (attachments.length > 0) {
        try {
          const results = await Promise.all(attachments.map(async (attachment) => {
            const MAX_SIZE = 5 << 20
            if (attachment.size > MAX_SIZE) {
              return this.response.sendError(res, StatusCodes.PayloadTooLarge, `${attachment.originalname} is too large`)
            }

            const extension = attachment.originalname.split('.').pop()
            if (!['jpg', 'png', 'mp4'].includes(extension)) {
              return this.response.sendError(res, StatusCodes.UnsupportedContent, `File extension is not allowed - ${attachment.originalname}`)
            }

            const response = await this.cloudinary.upload(attachment, {
              folder: 'QuidateFinance/reports',
              resource_type: extension === 'mp4' ? 'video' : 'image'
            })

            return {
              public_url: response.url,
              public_id: response.public_id,
              secure_url: response.secure_url,
            }
          }))

          filesArray = results.filter((result): result is Attachment => !!result)
        } catch (err) {
          try {
            if (filesArray.length > 0) {
              for (const file of filesArray) {
                if (file?.public_id) {
                  await this.cloudinary.delete(file.public_id)
                }
              }
            }
          } catch (err) {
            console.error(err)
            this.response.sendError(res, StatusCodes.InternalServerError, 'Error uploading attachments')
          }
        }
      }

      await this.prisma.report.create({
        data: {
          subject,
          category,
          description,
          attachments: filesArray,
        }
      })

      this.response.sendSuccess(res, StatusCodes.OK, {
        message: "Your complaint has been submitted"
      })
    } catch (err) {
      this.misc.handleServerError(res, err, 'Error submitting complaint')
    }
  }

  async deleteAccount(res: Response, { sub: id }: ExpressUser) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          logs: true,
          totp: true,
          customer: true,
          recipients: true,
          notifications: true,
          virtualAccount: {
            include: {
              recipients: true,
            },
          },
          walletAddresses: true,
          transactionHistories: true,
        },
      })

      await this.prisma.$transaction([
        this.prisma.customer.delete({ where: { userId: id } }),
        ...user.walletAddresses.map((wallet) =>
          this.prisma.walletAddress.delete({ where: { id: wallet.id } })
        ),
        ...user.notifications.map((notification) =>
          this.prisma.notification.delete({ where: { id: notification.id } })
        ),
        ...(user.virtualAccount
          ? [
            this.prisma.virtualAccount.update({
              where: { userId: '65dca231010a3b89f2fe97dc' },
              data: {
                usdBalance: { increment: user.virtualAccount.usdBalance },
                ngnBalance: { increment: user.virtualAccount.ngnBalance },
              },
            }),
            ...user.virtualAccount.recipients.map((recipient) =>
              this.prisma.recipient.delete({ where: { id: recipient.id } })
            ),
            ...user.recipients.map((localRecipient) =>
              this.prisma.localRecipient.delete({ where: { id: localRecipient.id } })
            ),
            this.prisma.virtualAccount.delete({ where: { userId: id } }),
          ]
          : []),
        ...user.logs.map((log) => this.prisma.log.delete({ where: { id: log.id } })),
        ...user.transactionHistories.map((history) =>
          this.prisma.transactionHistory.delete({ where: { id: history.id } })
        ),
        this.prisma.user.delete({ where: { id } }),
      ])

      this.response.sendSuccess(res, StatusCodes.OK, {
        message: 'Your account has been deleted successfully.',
      })
    } catch (err) {
      this.misc.handleServerError(res, err, 'Error deleting account.')
    }
  }
}
