import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/db";
import { getDocument } from "@/lib/items";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await readSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const doc = getDocument(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const filePath = path.join(UPLOAD_DIR, doc.stored_name);
  try {
    const data = await readFile(filePath);
    const filename = doc.original_name.replace(/[\r\n"]/g, "");
    return new NextResponse(Uint8Array.from(data), {
      headers: {
        "Content-Type": doc.mime,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
