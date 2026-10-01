import {
    pipeline,
    type FeatureExtractionPipeline,
} from '@huggingface/transformers'
import { createClient } from '@/lib/supabase/server'
import { extractTextFromFile } from './extract-text'
import { chunkText } from './chunk-text'

let embeddingPipeline:
    | FeatureExtractionPipeline
    | null = null

async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
    if (!embeddingPipeline) {
        embeddingPipeline =
            (await pipeline(
                'feature-extraction',
                'Xenova/all-MiniLM-L6-v2'
            )) as FeatureExtractionPipeline
    }

    return embeddingPipeline
}

export async function processMaterial(
    materialId: string,
    userId: string
): Promise<void> {
    const supabase = await createClient()

    const {
        data: material,
        error: materialError,
    } = await supabase
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

    const {
        data: fileData,
        error: downloadError,
    } = await supabase.storage
        .from('materials')
        .download(material.storage_path)

    if (downloadError || !fileData) {
        throw new Error(
            'Could not download material file'
        )
    }

    const file = new File(
        [fileData],
        material.filename,
        {
            type: fileData.type,
        }
    )

    const extractedText =
        await extractTextFromFile(
            file,
            material.file_type
        )

    const chunks =
        chunkText(extractedText)

    if (chunks.length === 0) {
        throw new Error(
            'No text could be extracted from material'
        )
    }

    /*
    =====================================================
    REMOVE EXISTING CHUNKS
    =====================================================
    */

    const {
        error: deleteError,
    } = await supabase
        .from('material_chunks')
        .delete()
        .eq(
            'material_id',
            material.id
        )
        .eq(
            'user_id',
            userId
        )

    if (deleteError) {
        throw new Error(
            'Could not replace existing material chunks'
        )
    }

    /*
    =====================================================
    GENERATE EMBEDDINGS
    =====================================================
    */

    const extractor =
        await getEmbeddingPipeline()

    const rows = []

    for (
        let index = 0;
        index < chunks.length;
        index++
    ) {
        const content =
            chunks[index]

        const output =
            await extractor(
                content,
                {
                    pooling: 'mean',
                    normalize: true,
                }
            )

        const embedding =
            output.tolist()[0]

        rows.push({
            material_id:
                material.id,
            user_id:
                material.user_id,
            chunk_index:
                index,
            content,
            embedding,
        })
    }

    /*
    =====================================================
    SAVE CHUNKS + EMBEDDINGS
    =====================================================
    */

    const {
        error: insertError,
    } = await supabase
        .from('material_chunks')
        .insert(rows)

    if (insertError) {
        console.error(
            'Material chunk insert error:',
            insertError
        )

        throw new Error(
            'Could not save material chunks'
        )
    }
}