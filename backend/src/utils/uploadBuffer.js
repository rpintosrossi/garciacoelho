const fs = require('fs');
const path = require('path');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = require('../config/s3');
const { getFileUrl } = require('./fileUtils');

/**
 * Sube un buffer (PDF) a S3 o disco local y devuelve la URL pública.
 */
async function uploadBuffer(buffer, { filename, contentType = 'application/pdf', folder = 'invoices' } = {}) {
  if (!buffer || !filename) {
    throw new Error('buffer y filename son obligatorios');
  }

  const key = `${folder}/${filename}`;

  if (process.env.USE_S3 === 'true') {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      throw new Error('AWS_S3_BUCKET no configurado');
    }
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType
      })
    );
    return getFileUrl(key);
  }

  const uploadsDir = path.join(__dirname, '..', '..', 'uploads', folder);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const localPath = path.join(uploadsDir, filename);
  fs.writeFileSync(localPath, buffer);
  return getFileUrl(`${folder}/${filename}`);
}

module.exports = {
  uploadBuffer
};
