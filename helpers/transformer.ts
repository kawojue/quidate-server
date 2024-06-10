export const titleText = (text: string) => {
    return text.trim()
        .split(" ")
        .map(txt => txt[0].toUpperCase() + txt.slice(1).toLowerCase())
        .join(" ")
}

export const toLowerCase = (text: string) => text.toLowerCase().trim()

export const toUpperCase = (text: string) => text.toUpperCase().trim()


const units = ['B', 'KB', 'MB', 'GB', 'TB']

export const formatSize = (size: number, unitIndex: number = 0): string => {
    const KB = 1024

    if (size < KB || unitIndex >= units.length - 1) {
        return `${size.toFixed(2)} ${units[unitIndex]}`
    }

    return formatSize(size / KB, unitIndex + 1)
}

export const normalizePhoneNumber = (phoneNumber: string) => {
    let normalized = phoneNumber.replace(/\D/g, '')

    if (normalized.startsWith('0')) {
        normalized = normalized.slice(1)
    }

    if (normalized.startsWith('00')) {
        normalized = normalized.slice(2)
    } else if (normalized.startsWith('+')) {
        normalized = normalized.slice(1)
    }

    return normalized
}

export const removeNullFields = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(removeNullFields)
    } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.keys(obj).reduce((acc, key) => {
            const value = obj[key]
            if (value !== null) {
                acc[key] = removeNullFields(value)
            }
            return acc
        }, {} as { [key: string]: any })
    } else {
        return obj
    }
}