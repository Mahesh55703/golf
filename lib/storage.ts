import fs from "fs";
import path from "path";
export interface UploadResult {
  url: string;
  storageKey: string;
  storageType: "local" | "vercel-blob";
  mimeType: string;
  fileSize: number;
}

// Allowed MIME types
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function saveMediaFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  // If VERCEL_BLOB_READ_WRITE_TOKEN is configured and @vercel/blob is available, use Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { put } = require("@vercel/blob");
      const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const blob = await put(`golfpulse/media/${safeName}`, buffer, {
        access: "public",
        contentType: mimeType,
      });
      return {
        url: blob.url,
        storageKey: blob.pathname,
        storageType: "vercel-blob",
        mimeType,
        fileSize: buffer.length,
      };
    } catch {
      // Fall through to local public storage
    }
  }

  // Otherwise, fallback to persistent local public storage
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const ext = path.extname(filename) || (mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg");
  const basename = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
  const uniqueName = `${Date.now()}_${basename}${ext}`;
  const filePath = path.join(uploadDir, uniqueName);

  fs.writeFileSync(filePath, buffer);

  return {
    url: `/uploads/${uniqueName}`,
    storageKey: `uploads/${uniqueName}`,
    storageType: "local",
    mimeType,
    fileSize: buffer.length,
  };
}
