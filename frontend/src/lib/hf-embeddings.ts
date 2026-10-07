import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2'

let extractor: FeatureExtractionPipeline | null = null

async function getExtractor(): Promise<FeatureExtractionPipeline> {
    if (!extractor) {
        extractor = await pipeline('feature-extraction', EMBEDDING_MODEL)
    }

    return extractor
}

export async function generateEmbedding(text: string): Promise<number[]> {
    const cleanText = text.trim()

    if (!cleanText) {
        throw new Error('Cannot generate an embedding from empty text')
    }

    const model = await getExtractor()

    const output = await model(cleanText, {
        pooling: 'mean',
        normalize: true,
    })

    return Array.from(output.data)
}