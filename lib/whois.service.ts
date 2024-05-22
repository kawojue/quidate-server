import axios from 'axios'
import { Request } from 'express'
import { Injectable } from '@nestjs/common'
import { getIpAddress } from 'helpers/getIPAddress'

@Injectable()
export class WhoisService {
    private baseURL = "http://ipwho.is"

    async getInfo(req: Request): Promise<IpInfo> {
        const ip = getIpAddress(req)

        const { data } = await axios.get(`${this.baseURL}/${ip}`)

        return data
    }
}