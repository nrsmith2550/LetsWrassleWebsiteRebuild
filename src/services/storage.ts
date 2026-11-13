import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';

/**
 * Pluggable file storage. STORAGE_DRIVER=local (default) writes to UPLOAD_DIR
 * (served by Express at /uploads). STORAGE_DRIVER=s3 uploads to any
 * S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2, MinIO, ...).
 */
const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const ALLOWED_IMAGE_TYPES = Object.keys(EXT);

let s3: S3Client | null = null;
function s3Client() {
  if (!s3) {
    const c = config.storage.s3;
    s3 = new S3Client({
      region: c.region,
      endpoint: c.endpoint,
      forcePathStyle: !!c.endpoint,
      credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
    });
  }
  return s3;
}

export async function saveImage(file: { buffer: Buffer; mimetype: string }): Promise<string> {
  const ext = EXT[file.mimetype];
  if (!ext) throw new Error('Unsupported image type');
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

  if (config.storage.driver === 's3') {
    const c = config.storage.s3;
    const key = `uploads/${name}`;
    await s3Client().send(
      new PutObjectCommand({
        Bucket: c.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000',
      }),
    );
    return `${c.publicUrl}/${key}`;
  }

  fs.mkdirSync(config.storage.uploadDir, { recursive: true });
  await fs.promises.writeFile(path.join(config.storage.uploadDir, name), file.buffer);
  return `/uploads/${name}`;
}
