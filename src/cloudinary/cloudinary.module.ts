import { ConfigModule } from '@nestjs/config'
import { DynamicModule, Module } from '@nestjs/common'
import { CloudinaryService } from './cloudinary.service'

@Module({})
export class CloudinaryModule {
    static forRootAsync(options: CloudinaryModuleOptions): DynamicModule {
        return {
            module: CloudinaryModule,
            imports: [ConfigModule],
            providers: [
                {
                    provide: 'CLOUDINARY_OPTIONS',
                    useValue: options,
                },
            ],
            exports: [CloudinaryService],
        }
    }
}