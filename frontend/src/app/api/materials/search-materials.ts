import { createClient } from '@/lib/supabase/server'

export type MaterialChunk = {
    material_id: string
    filename: string
    chunk_index: number
    content: string
}

export async function searchMaterials(
    userId: string,
    query: string
): Promise<MaterialChunk[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('material_chunks')
        .select(`
            material_id,
            chunk_index,
            content,
            materials!inner (
                filename
            )
        `)
        .eq('user_id', userId)

    if (error) {
        console.error('Material search error:', error)
        throw new Error('Could not search materials')
    }

    if (!data) {
        return []
    }

    const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z0-9]/g, ''))
        .filter((word) => word.length >= 3)

    if (keywords.length === 0) {
        return []
    }

    const scoredResults = data
        .map((chunk) => {
            const content = chunk.content.toLowerCase()

            const score = keywords.reduce((total, keyword) => {
                return total + (content.includes(keyword) ? 1 : 0)
            }, 0)

            const material = Array.isArray(chunk.materials)
                ? chunk.materials[0]
                : chunk.materials

            return {
                material_id: chunk.material_id,
                filename: material?.filename ?? 'Unknown file',
                chunk_index: chunk.chunk_index,
                content: chunk.content,
                score,
            }
        })
        .filter((chunk) => chunk.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)

    return scoredResults.map((chunk) => ({
        material_id: chunk.material_id,
        filename: chunk.filename,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
    }))
}