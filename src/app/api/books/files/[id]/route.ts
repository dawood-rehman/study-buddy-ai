import { NextRequest } from "next/server";
import { Binary, ObjectId } from "mongodb";
import { getDb } from "@/lib/server/mongodb";

export const runtime = "nodejs";

type BookFileDocument = {
  _id: ObjectId;
  fileName: string;
  contentType: string;
  size: number;
  data: Binary | Buffer;
  createdAt: Date;
};

function fileSafeName(name: string) {
  return name.replace(/["\r\n]/g, "").trim() || "book-file";
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!ObjectId.isValid(params.id)) {
    return new Response("Invalid file id.", { status: 400 });
  }

  const db = await getDb();
  const file = await db.collection<BookFileDocument>("bookFiles").findOne({ _id: new ObjectId(params.id) });

  if (!file) {
    return new Response("File not found.", { status: 404 });
  }

  const bytes = file.data instanceof Binary ? file.data.buffer : Buffer.from(file.data);
  const shouldDownload = request.nextUrl.searchParams.get("download") === "1";
  const disposition = shouldDownload ? "attachment" : "inline";

  return new Response(bytes, {
    headers: {
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Length": String(file.size || bytes.byteLength),
      "Content-Disposition": `${disposition}; filename="${fileSafeName(file.fileName)}"`,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
