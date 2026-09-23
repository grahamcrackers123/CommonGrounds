import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

export async function extractTextFromFile(
    file: File,
    fileType: string
): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer())

    switch (fileType) {
        case 'pdf': {
            const parser = new PDFParse({
                data: buffer,
            })

            try {
                const result = await parser.getText()

                return result.text
            } finally {
                await parser.destroy()
            }
        }

        case 'docx': {
            const result = await mammoth.extractRawText({
                buffer,
            })

            return result.value
        }

        case 'txt':
        case 'md': {
            return buffer.toString('utf-8')
        }

        default:
            throw new Error(`Unsupported file type: ${fileType}`)
    }
}