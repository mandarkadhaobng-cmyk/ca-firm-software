/**
 * Cloudflare R2 Storage Service
 * R2 is S3-compatible, so we use the AWS S3 SDK pointed at R2's endpoint.
 *
 * Required .env variables:
 *   VITE_R2_ACCOUNT_ID      — your Cloudflare Account ID
 *   VITE_R2_ACCESS_KEY_ID   — R2 API Token Access Key
 *   VITE_R2_SECRET_KEY      — R2 API Token Secret Key
 *   VITE_R2_BUCKET_NAME     — R2 bucket name (e.g. "ca-firm-assets")
 *   VITE_R2_PUBLIC_URL      — public URL of your bucket (e.g. https://pub-xxx.r2.dev)
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const accountId   = import.meta.env.VITE_R2_ACCOUNT_ID;
const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const secretKey   = import.meta.env.VITE_R2_SECRET_KEY;
const bucket      = import.meta.env.VITE_R2_BUCKET_NAME;
const publicUrl   = import.meta.env.VITE_R2_PUBLIC_URL?.replace(/\/$/, '');

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey: secretKey,
  },
});

export const storageService = {
  /**
   * Upload a file to R2.
   * @param {File}   file        — the File object from an <input type="file">
   * @param {string} folder      — e.g. "logos", "attachments"
   * @param {string} [fileName]  — optional custom filename; defaults to a timestamp name
   * @returns {string} The public URL of the uploaded file
   */
  async upload(file, folder = 'uploads', fileName) {
    const ext    = file.name.split('.').pop();
    const key    = `${folder}/${fileName || `${Date.now()}-${Math.random().toString(36).slice(2)}`}.${ext}`;
    const buffer = await file.arrayBuffer();

    await r2Client.send(
      new PutObjectCommand({
        Bucket:      bucket,
        Key:         key,
        Body:        new Uint8Array(buffer),
        ContentType: file.type,
        // Make publicly readable (requires bucket to have Public Access enabled)
        ACL: 'public-read',
      })
    );

    return `${publicUrl}/${key}`;
  },

  /**
   * Delete a file from R2 by its full public URL.
   */
  async deleteByUrl(fileUrl) {
    if (!fileUrl || !publicUrl) return;
    const key = fileUrl.replace(`${publicUrl}/`, '');
    await r2Client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key })
    );
  },

  /**
   * Upload a firm logo specifically.
   * Returns the public URL.
   */
  async uploadLogo(firmId, file) {
    return this.upload(file, `logos/${firmId}`, `logo-${Date.now()}`);
  },
};
