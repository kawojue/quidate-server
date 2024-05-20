import { Request } from 'express'

const getIpAddress = (req: Request): string => {
    const remoteAddress = req.ip
    let ipAddress: string | undefined

    if (remoteAddress) {
        if (remoteAddress.includes(':')) {
            ipAddress = remoteAddress.replace('[', '').replace(']', '')
        } else {
            ipAddress = remoteAddress
        }
    }

    return ipAddress || ''
}

export { getIpAddress }