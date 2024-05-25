import { Response, Request } from 'express'
import { StatusCodes } from 'enums/statusCodes'
import { SkipThrottle } from '@nestjs/throttler'
import { WebhooksService } from './webhooks.service'
import { Controller, HttpException, Post, Req, Res } from '@nestjs/common'

@SkipThrottle()
@Controller('webhooks')
export class WehbooksController {
  constructor(private readonly webhooksService: WebhooksService) { }

  @Post('bitpower/61104680')
  async manageCryptoEvents(@Req() req: Request, @Res() res: Response) {
    if (!req.body || !req.body?.event || !req.body?.data) {
      throw new HttpException('Invalid request body received', StatusCodes.Unauthorized)
    }

    const secretHash = req.headers['x-webhook-bt-quidate']
    const decodedHash = atob(secretHash as string)

    if (decodedHash === process.env.BITPOWER_WEBHOOK_SECRET) {
      return await this.webhooksService.manageCryptoEvents(res, req)
    }
  }

  @Post('/paystack/74223451')
  async manageFiatEvents(@Req() req: Request) {
    if (!req.body || !req.body?.event || !req.body?.data) {
      throw new HttpException('Invalid request body received', StatusCodes.Unauthorized)
    }

    const secretHash = req.headers['x-webhook-ps-quidate']
    const decodedHash = atob(secretHash as string)

    if (decodedHash === process.env.PS_WEBHOOK_SECRET) {
      return await this.webhooksService.manageFiatEvents(req)
    }
  }
}
