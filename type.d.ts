interface IGenOTP {
    totp: string
    totp_expiry: Date
}

interface CloudinaryModuleOptions {
    cloudName: string
    apiKey: string
    apiSecret: string
}

interface FileDest {
    folder: string
    resource_type: 'image' | 'video'
}

interface Attachment {
    public_id: string
    public_url: string
    secure_url: string
}

type Method = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH'

interface Log {
    ip: string
    query?: string
    endpoint: string
    method: Method
    full_url: string
    userAgent: string
    requestSize: string
    responseSize: string
    statusCode: number
    elapsedTimeDuration: string
    os?: string
    device?: string
    deviceType?: string
    browser?: string
    requestedAt: Date
    responsedAt: Date
}

interface Fee {
    processingFee: number
    paystackFee: number
    totalFee: number
}

type EventType = 'transaction.incoming' | 'transaction.deposit.created' | FiatEvents

type UserStatus = 'active' | 'suspended'
type Roles = 'user' | 'admin' | 'moderator'

interface ExpressUser extends Express.User {
    sub: string
    role: Roles
    userStatus?: UserStatus
}

interface IRequest extends Request {
    user: ExpressUser
}

interface JwtPayload {
    sub: string
    role: Roles
    userStatus?: UserStatus
}

interface Item {
    name: string
    rate?: number
    quantity?: number
    amount?: number
}

interface IpInfo {
    ip: string
    success: boolean
    type: string
    continent: string
    continent_code: string
    country: string
    country_code: string
    region: string
    region_code: string
    city: string
    latitude: number
    longitude: number
    is_eu: boolean
    postal: string
    calling_code: string
    capital: string
    borders: string
    flag: {
        img: string
        emoji: string
        emoji_unicode: string
    }
    connection: {
        asn: number
        org: string
        isp: string
        domain: string
    }
    timezone: {
        id: string
        abbr: string
        is_dst: boolean
        offset: number
        utc: string
        current_time: string
    }
    currency: {
        name: string
        code: string
        symbol: string
        plural: string
        exchange_rate: number
    }
    security: {
        anonymous: boolean
        proxy: boolean
        vpn: boolean
        tor: boolean
        hosting: boolean
    }
}