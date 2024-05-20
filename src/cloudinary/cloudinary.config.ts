import {
    CLOUDINARY_API_KEY,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_SECRET,
} from './cloudinary.constants'
import { registerAs } from '@nestjs/config'

export default registerAs('cloudinary', () => ({
    apiKey: CLOUDINARY_API_KEY,
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiSecret: CLOUDINARY_API_SECRET,
}))