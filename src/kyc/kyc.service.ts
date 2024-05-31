import { Injectable } from '@nestjs/common'
import { MiscService } from 'lib/misc.service'
import { PlunkService } from 'lib/plunk.service'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'lib/response.service'
import { EncryptionService } from 'lib/encryption.service'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Injectable()
export class KycService {
    constructor(
        private readonly misc: MiscService,
        private readonly plunk: PlunkService,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
        private readonly encryption: EncryptionService,
        private readonly cloudinary: CloudinaryService,
    ) { }
}
