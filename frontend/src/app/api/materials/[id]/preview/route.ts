import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { extractTextFromFile } from "../../extract-text";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: material, error: materialError } =
      await supabase
        .from("materials")
        .select("id, filename, storage_path, file_type")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (materialError || !material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    const { data: fileData, error: downloadError } =
      await supabase.storage
        .from("materials")
        .download(material.storage_path);

    if (downloadError || !fileData) {
      console.error("Material preview download error:", downloadError);

      return NextResponse.json(
        { error: "Could not download material." },
        { status: 500 }
      );
    }

    const file = new File(
      [fileData],
      material.filename,
      { type: fileData.type }
    );

    const content = await extractTextFromFile(
      file,
      material.file_type
    );

    return NextResponse.json({
      id: material.id,
      filename: material.filename,
      content,
    });
  } catch (error) {
    console.error("Material preview error:", error);

    return NextResponse.json(
      { error: "Could not preview material." },
      { status: 500 }
    );
  }
}