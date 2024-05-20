import { Injectable } from '@nestjs/common'
const sdk = require('api')('@bitpowrhq/v1.0#qyrn235ulmottoun')

@Injectable()
export class BitPowrSdkService {
    private sdk: any

    constructor() {
        this.sdk = sdk
        this.sdk.auth(process.env.BITPOWER_TOKEN)
    }

    getSdk() {
        return this.sdk
    }
}