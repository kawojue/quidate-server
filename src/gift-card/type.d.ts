interface GiftCardCountryInfo {
    isoName: string
    name: string
    continent: string
    currencyCode: string
    currencyName: string
    currencySymbol: string
    flag: string
    callingCodes: string[]
}

interface GiftCardProduct {
    productId: number
    productName: string
    global: boolean
    supportsPreOrder: boolean
    senderFee: number
    discountPercentage: number
    denominationType: "FIXED" | "FLEXIBLE"
    recipientCurrencyCode: string
    minRecipientDenomination: number | null
    maxRecipientDenomination: number | null
    senderCurrencyCode: string
    minSenderDenomination: number | null
    maxSenderDenomination: number | null
    fixedRecipientDenominations: number[]
    fixedSenderDenominations: number[]
    fixedRecipientToSenderDenominationsMap: { [key: string]: number }[]
    logoUrls: string[]
    brand: {
        brandId: number
        brandName: string
    }
    country: {
        isoName: string
        name: string
        flagUrl: string
    }
    redeemInstruction: {
        concise: string
        verbose: string
    }
}

interface GiftCardProducts {
    content: GiftCardProduct[]
}

interface GiftCardDiscountProduct {
    product: {
        productId: number
        productName: string
        countryCode: string
        global: boolean
    }
    discountPercentage: nunber
}

interface GiftCardDiscountProducts {
    content: GiftCardDiscountProduct[]
}

interface Brand {
    id: number
    name: string
    status: 'ACTIVE'
}

interface Reloadly {
    scope: string
    expires_in: number
    token_type: string
    access_token: string
}