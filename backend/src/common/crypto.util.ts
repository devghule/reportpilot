import * as CryptoJS from 'crypto-js';

function getSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error('ENCRYPTION_SECRET is not configured.');
  }

  return secret;
}

export const encrypt = (text: string): string =>
  CryptoJS.AES.encrypt(text, getSecret()).toString();

export const decrypt = (cipher: string): string =>
  CryptoJS.AES.decrypt(cipher, getSecret()).toString(CryptoJS.enc.Utf8);