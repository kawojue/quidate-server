import axios from 'axios'
import { Injectable } from '@nestjs/common'
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class ThreatIntelService {
    private readonly threatIntelUrl = 'https://api.abuseipdb.com/api/v2/blacklist'

    constructor(private readonly prisma: PrismaService) { }

    async updateBlacklist() {
        try {
            const { data } = await axios.get(this.threatIntelUrl, {
                headers: {
                    'Key': process.env.ABUSEIPDB_API_KEY,
                    'Accept': 'application/json'
                }
            })

            const maliciousIps = data.data
            for (const ipInfo of maliciousIps) {
                const ip = ipInfo.ipAddress
                await this.prisma.blacklistedIP.upsert({
                    where: { ip },
                    update: {},
                    create: { ip },
                })
            }
        } catch (error) {
            console.error('Failed to update blacklist from threat intel feed:', error)
        }
    }
}
