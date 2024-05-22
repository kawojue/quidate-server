import { Injectable } from '@nestjs/common'
import { ThreatIntelService } from './threat.service'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AssetMetadataService } from './asset-metadata.service'

@Injectable()
export class TaskService {
    constructor(
        private readonly assetMetadata: AssetMetadataService,
        private readonly threatIntelService: ThreatIntelService,
    ) { }

    @Cron('0 0 * * *')
    async handleThreatIntel() {
        await this.threatIntelService.updateBlacklist()
    }

    @Cron(CronExpression.EVERY_30_MINUTES)
    async handleAssetMetadata() {
        await this.assetMetadata.fetchAndStoreP2PPriceConversion()
    }
}
