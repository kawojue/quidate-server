import { Injectable } from '@nestjs/common'
import { Consumer } from './consumer.service'

@Injectable()
export class PaystackService {
    private readonly consumer: Consumer

    constructor() {
        this.consumer = new Consumer('https://api.paystack.co', `Bearer ${process.env.PS_SECRET_KEY}`)
    }

    createCustomer(customer: CreateCustomerData) {
        return this.consumer.sendRequest<CreateCustomerResponse>('POST', '/customer', customer)
    }

    validateCustomer(customerCode: CodeOrId, body: ValidateCustomerData) {
        return this.consumer.sendRequest<PaystackResponse>('POST', `/customer/${customerCode}/identification`, body)
    }

    updateCustomer(customerCode: CodeOrId, customer: CreateCustomerOptionalData) {
        return this.consumer.sendRequest<CreateCustomerResponse>('PUT', `/customer/${customerCode}`, customer)
    }

    createDedicatedVirtualAccount(body: CreateDedicatedVirtualAccountData) {
        return this.consumer.sendRequest<CreateDedicatedVirtualAccountResponse>('POST', '/dedicated_account', body)
    }

    deactivateDedicatedVirtualAccount(dedicatedAccountId: number) {
        return this.consumer.sendRequest<DeactivateDedicatedVirtualAccountResponse>('DELETE', `/dedicated_account/${dedicatedAccountId}`)
    }

    verifyDetails({ account_number, bank_code }: VerifyDetailsData) {
        const url = `/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`
        return this.consumer.sendRequest<VerifyDetailsResponse>('GET', url)
    }

    createRecipient(body: CreateRecipientData) {
        return this.consumer.sendRequest<CreateRecipientResponse>('POST', '/transferrecipient', body)
    }

    deleteRecipient(recipientCodeOrId: CodeOrId) {
        return this.consumer.sendRequest<PaystackResponse>('DELETE', `/transferrecipient${recipientCodeOrId}`)
    }

    updateRecipient(recipientCodeOrId: CodeOrId, body: {
        name?: string
        email?: string
    }) {
        return this.consumer.sendRequest<CreateRecipientResponse>('PUT', `/transferrecipient${recipientCodeOrId}`, body)
    }

    initiateTransfer(body: InitiateTransferData) {
        return this.consumer.sendRequest<TransferResponse>('POST', '/transfer', body)
    }

    fetchTransfer(transfer_code: CodeOrId) {
        const url = `/transfer/${transfer_code}`
        return this.consumer.sendRequest<TransferResponse>('GET', url)
    }

    verifyTransfer(reference: string) {
        return this.consumer.sendRequest<TransferEventData>('GET', `/transfer/verify/${reference}`)
    }

    verifyTransaction(reference: string) {
        return this.consumer.sendRequest<VerifyTransaction>('GET', `transaction/verify/${reference}`)
    }

    listBanks() {
        const url = `/bank?country=nigeria&perPage=300`
        return this.consumer.sendRequest<ListBanksResponse>('GET', url)
    }

    async getBankByBankCode(bankCode: string): Promise<Bank> {
        const { data } = await this.listBanks()

        const bankDictionary = data.reduce((acc, bank) => {
            acc[bank.code] = bank
            return acc
        }, {})

        const bank = bankDictionary[bankCode]

        return bank
    }

    resolveAccount(account_number: string, bank_code: CodeOrId) {
        const url = `/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`
        return this.consumer.sendRequest<ResolveAccountResponse>('GET', url)
    }
}