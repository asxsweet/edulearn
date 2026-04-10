import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

let _client = null;

/**
 * S3-сүйісімді сақтау (AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces).
 * Орнатылғанда курс обложкалары мен аватарлар тұрақты URL-ге жүктеледі (локалды /uploads емес).
 */
export function getObjectStorageConfig() {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim() || 'us-east-1';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.S3_ENDPOINT?.trim() || '';
  const publicBase = process.env.S3_PUBLIC_BASE_URL?.trim() || '';

  if (!bucket || !accessKeyId || !secretAccessKey || !publicBase) {
    return null;
  }
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== '0';
  return { bucket, region, accessKeyId, secretAccessKey, endpoint, publicBase, forcePathStyle };
}

export function isObjectStorageEnabled() {
  return getObjectStorageConfig() !== null;
}

function getClient() {
  const c = getObjectStorageConfig();
  if (!c) throw new Error('Object storage not configured');
  if (_client) return _client;
  _client = new S3Client({
    region: c.region,
    ...(c.endpoint
      ? {
          endpoint: c.endpoint,
          forcePathStyle: c.forcePathStyle,
        }
      : {}),
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  });
  return _client;
}

export function publicUrlForKey(key) {
  const c = getObjectStorageConfig();
  if (!c) throw new Error('Object storage not configured');
  const base = c.publicBase.replace(/\/$/, '');
  const encoded = String(key)
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${base}/${encoded}`;
}

export function objectKeyFromPublicUrl(fullUrl) {
  const c = getObjectStorageConfig();
  if (!c) return null;
  const base = c.publicBase.replace(/\/$/, '');
  const u = String(fullUrl).trim().split('?')[0];
  if (!u.startsWith(base + '/') && u !== base) return null;
  const raw = u.slice(base.length + 1);
  if (!raw) return null;
  return raw
    .split('/')
    .map((seg) => decodeURIComponent(seg))
    .join('/');
}

export async function putPublicObject({ key, body, contentType }) {
  const c = getObjectStorageConfig();
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: c.bucket,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    })
  );
  return publicUrlForKey(key);
}

async function deleteObjectByPublicUrl(fullUrl) {
  if (!isObjectStorageEnabled()) return;
  const key = objectKeyFromPublicUrl(fullUrl);
  if (!key) return;
  const c = getObjectStorageConfig();
  const client = getClient();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: key }));
  } catch {
    /* */
  }
}

/**
 * Дерекқордағы жол: /uploads/... немесе толық https URL (объектілік сақтау).
 */
export async function deleteStoredAsset(storedPath, uploadsRoot) {
  const p = storedPath && String(storedPath).trim();
  if (!p) return;
  if (p.startsWith('http://') || p.startsWith('https://')) {
    await deleteObjectByPublicUrl(p);
    return;
  }
  if (p.startsWith('/uploads/') && uploadsRoot) {
    const rel = p.replace(/^\/uploads\//, '');
    const fp = path.join(uploadsRoot, rel);
    try {
      fs.unlinkSync(fp);
    } catch {
      /* */
    }
  }
}
