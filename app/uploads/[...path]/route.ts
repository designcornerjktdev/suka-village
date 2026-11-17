import { readUpload } from "@/lib/server/storage";

/**
 * GET /uploads/<year>/<id>.jpg: a photograph uploaded in the admin. Names are
 * never reused, so the file can be cached for a year.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const file = path.some((p) => p === ".." || p.includes("\\") || p.includes("\0")) ? null : await readUpload(path.join("/"));
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
