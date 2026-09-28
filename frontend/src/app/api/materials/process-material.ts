import { createClient } from '@/lib/supabase/server'
import { extractTextFromFile } from './extract-text'
import { chunkText } from './chunk-text'

export async function processMaterial(
    materialId: string,
    userId: string
): Promise<void> {
    const supabase = await createClient()

    const { data: material, error: materialError } = await supabase
        .from('materials')
        .select(`
            id,
            user_id,
            filename,
            storage_path,
            file_type
        `)
        .eq('id', materialId)
        .eq('user_id', userId)
        .single()

    if (materialError || !material) {
        throw new Error('Material not found')
    }

    const { data: fileData, error: downloadError } =
        await supabase.storage
            .from('materials')
            .download(material.storage_path)

    if (downloadError || !fileData) {
        throw new Error('Could not download material file')
    }

    const file = new File(
        [fileData],
        material.filename,
        {
            type: fileData.type,
        }
    )

    const extractedText = await extractTextFromFile(
        file,
        material.file_type
    )

    const chunks = chunkText(extractedText)

    if (chunks.length === 0) {
        throw new Error('No text could be extracted from material')
    }

    // Remove existing chunks before saving the newly processed chunks.
    const { error: deleteError } = await supabase
        .from('material_chunks')
        .delete()
        .eq('material_id', material.id)
        .eq('user_id', userId)

    if (deleteError) {
        throw new Error('Could not replace existing material chunks')
    }

    const rows = chunks.map((content, index) => ({
        material_id: material.id,
        user_id: material.user_id,
        chunk_index: index,
        content,
    }))

    const { error: insertError } = await supabase
        .from('material_chunks')
        .insert(rows)

    if (insertError) {
        throw new Error('Could not save material chunks')
    }
}