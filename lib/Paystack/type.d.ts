type CountryCode = "NG"
type CurrencyCode = "NGN"
type AccountType = "nuban"
type TransferSource = "balance"
type CustomerType = "bank_account"
type ChargeEvent = "charge.success"
type TransferWebhookStatus = "success" | "failed" | "reversed"
type TransferWebhookEvent = "transfer.success" | "transfer.failed" | "transfer.reversed"
type CustomerIdentificationEvent = "customeridentification.failed" | "customeridentification.success"
type FiatEvents = CustomerIdentificationEvent | TransferWebhookEvent | ChargeEvent

interface PaystackResponse<T = {}> {
    status: boolean
    message: string
    data?: T
}

type CodeOrId = string | number

interface CreateCustomerResponse {
    status: boolean
    message: string
    data: {
        email: string
        integration: number
        domain: string
        customer_code: string
        id: number
        phone?: string
        identified: boolean
        identifications: null
        createdAt: string
        updatedAt: string
    }
}

interface CreateCustomerData {
    email: string
    first_name: string
    last_name: string
    phone?: string
    metadata?: Record<string, any>
}

interface ValidateCustomerData {
    first_name: string
    last_name: string
    type: CustomerType
    country: CountryCode
    bvn: string
    bank_code: string
    account_number: string
}

interface CreateCustomerOptionalData extends Partial<CreateCustomerData> {
    email?: string
    metadata?: Record<string, any>
}

interface CreateDedicatedVirtualAccountData {
    customer: CodeOrId
    preferred_bank: 'wema-bank' | 'test-bank'
}

interface DedicatedVirtualAccountResponseData {
    bank: {
        id: number
        name: string
        slug: string
    }
    assignment: {
        integration: number
        assignee_id: number
        assignee_type: string
        expired: boolean
        account_type: string
        assigned_at: string
    }
    customer: {
        id: number
        first_name: string
        last_name: string
        email: string
        customer_code: string
        phone: string
        risk_action: string
    }
    account_name: string
    account_number: string
    assigned: boolean
    currency: string
    metadata: Record<string, any> | null
    active: boolean
    id: number
    created_at: string
    updated_at: string
}

interface CreateDedicatedVirtualAccountResponse extends PaystackResponse<DedicatedVirtualAccountResponseData> { }

interface DeactivateDedicatedVirtualAccountResponse extends PaystackResponse<DedicatedVirtualAccountResponseData> { }

interface CreateRecipientData {
    type: AccountType
    name: string
    account_number: string
    bank_code: string
    currency: CurrencyCode
}

interface CreateRecipientResponseData {
    active: boolean
    createdAt: string
    currency: CurrencyCode
    domain: string
    id: number
    integration: number
    name: string
    recipient_code: string
    type: AccountType
    updatedAt: string
    is_deleted: boolean
    details: {
        authorization_code?: string
        account_number: string
        account_name: string
        bank_code: string
        bank_name: string
    }
}

interface CreateRecipientResponse extends PaystackResponse<CreateRecipientResponseData> { }

interface VerifyDetailsData {
    account_number: string
    bank_code: string
}

interface VerifyDetailsResponse extends PaystackResponse<VerifyDetailsData> { }

interface ListBanksResponse extends PaystackResponse<Bank[]> {
    meta: {
        next?: string
        previous?: string
        perPage: number
    }
}

interface Bank {
    name: string
    slug: string
    code: string
    longcode: string
    gateway: string | null
    pay_with_bank: boolean
    active: boolean
    is_deleted: boolean
    country: string
    currency: string
    type: string
    id: number
    createdAt: string
    updatedAt: string
}

interface InitiateTransferData {
    source: TransferSource
    reason?: string
    amount: number
    recipient: CodeOrId
    reference: string
}

interface InitiateTransferDataResponse {
    reference: string
    integration: number
    domain: string
    amount: number
    currency: CurrencyCode
    source: TransferSource
    reason: string
    recipient: CodeOrId
    status: string
    transfer_code: string
    id: number
    createdAt: string
    updatedAt: string
}

interface TransferResponse extends PaystackResponse<InitiateTransferDataResponse> { }

interface IntegrationData {
    id: number
    is_live: boolean
    business_name: string
}

interface RecipientDetails {
    authorization_code: string | null
    account_number: string
    account_name: string | null
    bank_code: string
    bank_name: string
}

interface RecipientData {
    active: boolean
    currency: CurrencyCode
    description: string | null
    domain: string
    email: string | null
    id: number
    integration: number
    metadata: Record<string, any> | null
    name: string
    recipient_code: string
    type: AccountType
    is_deleted: boolean
    details: RecipientDetails
    created_at: string
    updated_at: string
}

interface TransferSession {
    provider: string | null
    id: string | null
}

interface TransferEventData {
    amount: number
    currency: CurrencyCode
    domain: string
    failures: null
    id: number
    integration: IntegrationData
    reason: string
    reference: string
    source: TransferSource
    source_details: null
    status: TransferWebhookStatus
    titan_code: null
    transfer_code: string
    transferred_at: string | null
    recipient: RecipientData
    session: TransferSession
    created_at: string
    updated_at: string
}

interface TransferEvent {
    event: TransferWebhookEvent
    data: TransferEventData
}

interface IdentificationData {
    country: CountryCode
    type: CustomerType
    bvn: string
    account_number: string
    bank_code: string
}

interface CustomerIdentificationSuccessData {
    customer_id: string
    customer_code: string
    email: string
    identification: IdentificationData
}

interface CustomerIdentificationFailedData extends CustomerIdentificationSuccessData {
    reason: string
}

interface CustomerIdentificationEventPayload {
    event: CustomerIdentificationEvent
    data: CustomerIdentificationSuccessData | CustomerIdentificationFailedData
}

interface ResolveAccount {
    bank_id: number
    account_name: string
    account_number: string
}

interface ResolveAccountResponse extends PaystackResponse<ResolveAccount> { }

interface ChargeSuccessEventData {
    event: ChargeEvent
    data: {
        id: number
        domain: string
        status: string
        reference: string
        amount: number
        message: string | null
        gateway_response: string
        paid_at: string
        created_at: string
        channel: string
        currency: string
        ip_address: string | null
        metadata: {
            receiver_account_number: string
            receiver_bank: string
            custom_fields: any[]
        }
        fees_breakdown: any[] | null
        log: any[] | null
        fees: number
        fees_split: any[] | null
        authorization: {
            authorization_code: string
            bin: string
            last4: string
            exp_month: string
            exp_year: string
            channel: string
            card_type: string
            bank: string | null
            country_code: string
            brand: string
            reusable: boolean
            signature: string | null
            account_name: string | null
            sender_country: string
            sender_bank: string | null
            narration: string | null
            sender_bank_account_number: string
            receiver_bank_account_number: string
            receiver_bank: string
        }
        customer: {
            id: number
            first_name: string
            last_name: string
            email: string
            customer_code: string
            phone: string
            metadata: any
            risk_action: string
            international_format_phone: string
        }
        plan: any
        subaccount: any
        split: any
        order_id: string | null
        paidAt: string
        requested_amount: number
        pos_transaction_data: any | null
        source: any | null
    }
}

interface VerifyTransaction {
    status: boolean
    message: string
    data: {
        id: number
        domain: string
        status: string
        reference: string
        amount: number
        message: string | null
        gateway_response: string
        paid_at: string
        created_at: string
        channel: string
        currency: string
        ip_address: string | null
        metadata: string
        log: {
            start_time: number
            time_spent: number
            attempts: number
            errors: number
            success: boolean
            mobile: boolean
            input: any[]
            history: {
                type: string
                message: string
                time: number
            }[]
        }
        fees: number
        fees_split: {
            paystack: number
            integration: number
            subaccount: number
            params: {
                bearer: string
                transaction_charge: string
                percentage_charge: string
            }
        }
        authorization: {
            authorization_code: string
            bin: string
            last4: string
            exp_month: string
            exp_year: string
            channel: string
            card_type: string
            bank: string
            country_code: string
            brand: string
            reusable: boolean
            signature: string
            account_name: string | null
        }
        customer: {
            id: number
            first_name: string | null
            last_name: string | null
            email: string
            customer_code: string
            phone: string | null
            metadata: any | null
            risk_action: string
        }
        plan: any | null
        order_id: string | null
        paidAt: string
        createdAt: string
        requested_amount: number
        transaction_date: string
        plan_object: any | null
        subaccount: {
            id: number
            subaccount_code: string
            business_name: string
            description: string
            primary_contact_name: string | null
            primary_contact_email: string | null
            primary_contact_phone: string | null
            metadata: any | null
            percentage_charge: number
            settlement_bank: string
            account_number: string
        }
    }
}