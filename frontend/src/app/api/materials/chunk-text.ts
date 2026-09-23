export function chunkText(
    text: string,
    chunkSize = 1500,
    overlap = 200
): string[] {
    const normalizedText = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    if (!normalizedText) {
        return []
    }

    const chunks: string[] = []

    let start = 0

    while (start < normalizedText.length) {
        const end = Math.min(
            start + chunkSize,
            normalizedText.length
        )

        const chunk = normalizedText
            .slice(start, end)
            .trim()

        if (chunk) {
            chunks.push(chunk)
        }

        if (end >= normalizedText.length) {
            break
        }

        start = end - overlap
    }

    return chunks
}