import { ApiTags } from '@nestjs/swagger'
import { KycService } from './kyc.service'
import { Controller } from '@nestjs/common'

@ApiTags("KYC")
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) { }
}
