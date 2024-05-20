import * as bcrypt from 'bcrypt'
import * as core from 'decrypt-core'
import { Injectable } from '@nestjs/common'

@Injectable()
export class EncryptionService {
    private readonly ENCRYPTION_KEY = process.env.HANDLE_ENCRYPTION_KEY

    async hash(password: string, saltRounds: number = 10): Promise<string> {
        const salt = await bcrypt.genSalt(saltRounds)
        return await bcrypt.hash(password, salt)
    }

    async compare(plain: string | Buffer, hashed: string): Promise<boolean> {
        return await bcrypt.compare(plain, hashed)
    }

    cipherSync(plain: string) {
        return core.encrypt(plain, this.ENCRYPTION_KEY)
    }

    decipherSync(encryted: string) {
        return core.decrypt(encryted, this.ENCRYPTION_KEY)
    }
}