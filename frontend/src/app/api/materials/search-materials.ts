import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'
import { createClient } from '@/lib/supabase/server'

export type MaterialChunk = {
    material_id: string
    filename: string
    chunk_index: number
    content: string
    similarity: number
}

let embeddingPipeline: FeatureExtractionPipeline | null = null

async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
    if (!embeddingPipeline) {
        embeddingPipeline = await pipeline(
            'feature-extraction',
            'Xenova/all-MiniLM-L6-v2'
        )
    }

    return embeddingPipeline
}

export async function searchMaterials(
    userId: string,
    query: string
): Promise<MaterialChunk[]> {
    const supabase = await createClient()

    const cleanQuery = query.trim()

    if (!cleanQuery) {
        return []
    }

    // Generate an embedding for the user's question.
    const extractor = await getEmbeddingPipeline()

    const output = await extractor(cleanQuery, {
        pooling: 'mean',
        normalize: true,
    })

    const queryEmbedding = Array.from(output.data)

    // Search the user's uploaded material chunks using pgvector.
    const { data, error } = await supabase.rpc(
        'match_material_chunks',
        {
            query_embedding: queryEmbedding,
            match_user_id: userId,
            match_threshold: 0.25,
            match_count: 4,
        }
    )

    if (error) {
        console.error('Material vector search error:', error)
        throw new Error('Could not search materials')
    }

    if (!data) {
        return []
    }

    return data.map((chunk: {
        material_id: string
        filename: string
        chunk_index: number
        content: string
        similarity: number
    }) => ({
        material_id: chunk.material_id,
        filename: chunk.filename,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        similarity: chunk.similarity,
    }))
}