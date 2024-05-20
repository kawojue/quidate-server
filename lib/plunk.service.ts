import Plunk from '@plunk/node'
import { Injectable } from '@nestjs/common'
import { SendParams } from '@plunk/node/dist/types/emails'

@Injectable()
export class PlunkService {
    private plunk: Plunk

    constructor() {
        this.plunk = new Plunk(process.env.PLUNK_SECRET_KEY)
    }

    async sendPlunkEmail({ to, subject, body }: SendParams) {
        try {
            await this.plunk.emails.send({ to, subject, body })
        } catch (err: unknown) {
            throw err
        }
    }
}