import { randomBytes } from 'crypto'

export function genFileName() {
    return `Qui_${randomBytes(2).toString('hex')}_${new Date().toDateString().split(" ").join('-')}`
}


export const generateOTP = (length: number = 6): IGenOTP => {
    let totp: string = ''
    const digits: string = '0123456789'
    for (let i = 0; i < length; i++) {
        totp += digits[Math.floor(Math.random() * length)]
    }

    const currentDate: Date = new Date()
    const expiryDate: Date = new Date(
        currentDate.setMinutes(currentDate.getMinutes() + 5)
    )

    return {
        totp,
        totp_expiry: expiryDate.toISOString()
    }
}

export const genRandomCode = (): string => {
    function randomString(length: number): string {
        let result = ''
        let characters = ''

        const startCharCode: number = 'a'.charCodeAt(0)
        const endCharCode: number = 'z'.charCodeAt(0)

        for (let i = startCharCode; i <= endCharCode; i++) {
            characters += String.fromCharCode(i)
        }

        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length))
        }
        return result
    }

    return `${randomString(2)}-${randomString(3)}-${Math.floor(Date.now() / 1000)}`
}