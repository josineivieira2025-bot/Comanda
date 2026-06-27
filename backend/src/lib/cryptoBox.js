import crypto from 'node:crypto';

function secretKey() {
  const secret = process.env.FISCAL_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('Configure FISCAL_SECRET ou JWT_SECRET para proteger dados fiscais.');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptText(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptText(payload) {
  if (!payload) return null;
  const [ivText, tagText, encryptedText] = payload.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]).toString('utf8');
}

export function encryptBuffer(buffer) {
  return encryptText(Buffer.from(buffer).toString('base64'));
}

export function decryptBuffer(payload) {
  const text = decryptText(payload);
  return text ? Buffer.from(text, 'base64') : null;
}
