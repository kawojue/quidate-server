import { Injectable } from '@nestjs/common'
import toStream = require('buffer-to-stream')
import { ConfigService } from '@nestjs/config'
import { genFileName } from 'helpers/generator'
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary'

@Injectable()
export class CloudinaryService {
    constructor(private readonly configService: ConfigService) {
        cloudinary.config({
            api_key: this.configService.get<string>('cloudinary.apiKey'),
            cloud_name: this.configService.get<string>('cloudinary.cloudName'),
            api_secret: this.configService.get<string>('cloudinary.apiSecret'),
        })
    }

    async upload(
        file: Express.Multer.File, header: FileDest,
    ): Promise<UploadApiResponse | UploadApiErrorResponse> {
        try {
            return new Promise((resolve, reject) => {
                const extension = file.originalname.split('.').pop()
                const upload = cloudinary.uploader.upload_stream({
                    ...header,
                    public_id: `${genFileName()}.${extension}`
                }, (error, result) => {
                    if (error) return reject(error)
                    resolve(result)
                })

                toStream(file.buffer).pipe(upload)
            })
        } catch (err) {
            console.error(err)
        }
    }

    async delete(public_id: string) {
        return await cloudinary.uploader.destroy(public_id)
    }
}