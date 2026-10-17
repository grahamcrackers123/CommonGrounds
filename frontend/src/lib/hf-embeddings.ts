import { InferenceClient } from '@huggingface/inference'

const token = process.env.HF_TOKEN

if (!token) {
    throw new Error('HF_TOKEN is not configured')
}

const hf = new InferenceClient(token)

const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

export async function generateEmbedding(
    text: string
): Promise<number[]> {
    const output = await hf.featureExtraction({
        model: EMBEDDING_MODEL,
        inputs: text,
        provider: 'hf-inference',
    })

    if (
        Array.isArray(output) &&
        output.length > 0 &&
        Array.isArray(output[0])
    ) {
        return output[0] as number[]
    }

    return output as number[]
}