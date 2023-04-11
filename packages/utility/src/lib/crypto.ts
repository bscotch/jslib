import { BinaryLike, default as nodeCrypto, Encoding } from 'crypto';
import { assert } from './types.js';

/**
 * Hash a string or binary data.
 */
export function hash(
  algorithm: string,
  source: BinaryLike,
  encoding: Encoding = 'hex',
) {
  return (
    nodeCrypto
      .createHash(algorithm)
      .update(source)
      // @ts-ignore
      .digest(encoding)
  );
}

export function sha1(source: BinaryLike, encoding: Encoding = 'hex') {
  return hash('sha1', source, encoding);
}

export function sha256(source: BinaryLike, encoding: Encoding = 'hex') {
  return hash('sha256', source, encoding);
}

export function md5(source: BinaryLike, encoding: Encoding = 'hex') {
  return hash('md5', source, encoding);
}

const ivLength = 16; // required for AES
const encoding = 'base64';
const algorithm = 'aes-256-cbc';

/**
 * Create a strong encryption of some source data using AES256-CBC
 */
export function encrypt(text: string | Buffer, key: string) {
  assert(key.length == 32, 'Key must be length 32');
  const iv = nodeCrypto.randomBytes(ivLength);
  const cipher = nodeCrypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString(encoding)}:${encrypted.toString(encoding)}`;
}

/**
 * Decrypt something encrypted using the sibling 'encrypt' function.
 */
export function decrypt(encryptionString: string, key: string) {
  assert(key.length == 32, 'Key must be length 32');
  const [iv, encrypted] = encryptionString
    .split(':')
    .map((string) => Buffer.from(string, encoding));
  const decipher = nodeCrypto.createDecipheriv(algorithm, Buffer.from(key), iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted;
}

export function randomBytes(bytes: number, encoding: Encoding): string;
export function randomBytes(bytes: number): Buffer;
export function randomBytes(
  bytes: number,
  encoding?: Encoding,
): string | Buffer {
  const buff = nodeCrypto.randomBytes(bytes);
  return encoding ? buff.toString(encoding) : buff;
}

// Character sets for random strings

const lowerAlpha = 'abcdefghijklmnopqrstuvwxyz';
const upperAlpha = lowerAlpha.toUpperCase();
const alpha = `${lowerAlpha}${upperAlpha}`;
const numeric = '0123456789';
const alphanumeric = `${numeric}${alpha}`;
const special = '!@#$%^&*()_+-=[]{}|;:,./<>?';
const space = '\t\n ';

const lowerConsonants = `bcdfghjklmnpqrstvwxz`;
const upperConsonants = lowerConsonants.toUpperCase();
const consonants = `${lowerConsonants}${upperConsonants}`;

/**
 * Named collections of subsets of ASCII characters,
 * such as lowercase letters, consanants, base64, etc.
 */
export const characterSets = {
  lower: lowerAlpha,
  upper: upperAlpha,
  alpha,
  numeric,
  alphanumeric,
  lowerAlphanumeric: `${numeric}${lowerAlpha}`,
  upperAlphanumeric: `${numeric}${upperAlpha}`,
  lowerConsonants,
  upperConsonants,
  consonants,
  consonumeric: `${numeric}${consonants}`,
  lowerConsonumeric: `${numeric}${lowerConsonants}`,
  special,
  space,
  base64: `${alphanumeric}+/`,
  base64Url: `${alphanumeric}-_`,
  hex: `${numeric}abcdef`,
} as const;
Object.freeze(characterSets);
export type CharacterSet = keyof typeof characterSets;

export function randomString(
  length: number,
  characterSet: CharacterSet | string[],
) {
  const bytes = nodeCrypto.randomBytes(length);
  const chars = Array.isArray(characterSet)
    ? characterSet.join('')
    : characterSets[characterSet];
  const out = [];
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = bytes[i] % chars.length;
    out.push(chars[bytes[i]]);
  }
  return out.join('');
}
