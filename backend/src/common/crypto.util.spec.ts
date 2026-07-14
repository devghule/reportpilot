process.env.ENCRYPTION_SECRET = 'test-secret-32-characters-long!!';

import { decrypt, encrypt } from './crypto.util';

describe('crypto.util', () => {
  it('round-trips a plaintext value through encrypt/decrypt', () => {
    const plaintext = 'a-meta-access-token-value';

    const ciphertext = encrypt(plaintext);

    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces different ciphertext for different plaintexts', () => {
    expect(encrypt('token-a')).not.toBe(encrypt('token-b'));
  });

  it('fails to decrypt with a different secret (regression guard: never rotate ENCRYPTION_SECRET casually)', () => {
    const ciphertext = encrypt('a-secret-value');

    const originalSecret = process.env.ENCRYPTION_SECRET;
    jest.resetModules();
    process.env.ENCRYPTION_SECRET = 'a-completely-different-secret!!';

    const { decrypt: decryptWithWrongSecret } = require('./crypto.util');

    expect(decryptWithWrongSecret(ciphertext)).not.toBe('a-secret-value');

    process.env.ENCRYPTION_SECRET = originalSecret;
  });
});
