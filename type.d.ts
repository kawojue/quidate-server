interface IGenOTP {
    totp: string
    totp_expiry: string
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

type Roles = 'user' | 'admin' | 'moderator'
type UserStatus = 'active' | 'suspended'

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

interface GenerateNewReloadlyTokenResponse {
    scope: string
    token_type: string
    expires_in: number
    access_token: string
}

interface Item {
    name: string
    rate?: number
    quantity?: number
    amount?: number
}