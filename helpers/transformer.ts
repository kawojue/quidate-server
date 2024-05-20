export const titleText = (text: string) => {
    return text.trim()
        .split(" ")
        .map(txt => txt[0].toUpperCase() + txt.slice(1).toLowerCase())
        .join(" ")
}

export const toLowerCase = (text: string) => text.toLowerCase().trim()

export const toUpperCase = (text: string) => text.toUpperCase().trim()

export const maskedBvn = (bvn: string) => {
    return bvn.length === 11 ? bvn.slice(0, 3) + '*****' + bvn.slice(-3) : bvn
}

export const formatSize = (size: number) => {
    let format = ''

    const KB = 1_024 as const
    const MB = 1_048_576 as const

    if (size >= MB) {
        format = `${(size / MB).toFixed(2)}MB`
    } else if (size >= KB) {
        format = `${(size / KB).toFixed(2)}KB`
    } else {
        format = `${size} B`
    }

    return format
}