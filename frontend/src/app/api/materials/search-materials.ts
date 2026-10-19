import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/hf-embeddings'
export type MaterialChunk = {
    material_id: string
    filename: string
    chunk_index: number
    content: string
    similarity: number
}



export async function searchMaterials(
    userId: string,
    query: string,
    questId?: string | null
): Promise<MaterialChunk[]> {
    const supabase = await createClient()

    const cleanQuery = query.trim()

    if (!cleanQuery) {
        return []
    }

    // Generate an embedding for the user's question.
    const queryEmbedding = await generateEmbedding(cleanQuery)

    /*
     * A question asked from a quest context asks for more
     * candidates, so filtering down to that quest's materials
     * still leaves enough relevant chunks.
     */
    const { data, error } = await supabase.rpc(
        'match_material_chunks',
        {
            query_embedding: queryEmbedding,
            match_user_id: userId,
            match_threshold: 0.25,
            match_count: questId ? 20 : 4,
        }
    )

    if (error) {
        console.error('Material vector search error:', error)
        throw new Error('Could not search materials')
    }

    const chunks: MaterialChunk[] = (data ?? []).map((chunk: {
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

    const cleanQuestId = questId?.trim()

    if (!cleanQuestId) {
        return chunks
    }

    /*
     * When the question comes from a quest, prefer materials
     * attached to that quest. If the quest has no materials yet,
     * fall back to the whole library so Ask Wasi still helps.
     */
    const { data: questMaterials, error: questMaterialsError } =
        await supabase
            .from('materials')
            .select('id')
            .eq('user_id', userId)
            .eq('quest_id', cleanQuestId)

    if (questMaterialsError) {
        console.error(
            'Quest material lookup error:',
            questMaterialsError
        )

        return chunks.slice(0, 4)
    }

    const questMaterialIds = new Set(
        (questMaterials ?? []).map((material) => material.id)
    )

    if (questMaterialIds.size === 0) {
        return chunks.slice(0, 4)
    }

    return chunks
        .filter((chunk) => questMaterialIds.has(chunk.material_id))
        .slice(0, 4)
}