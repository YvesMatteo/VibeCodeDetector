import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Derive a 256-bit encryption key.
 * Prefers ENCRYPTION_KEY env var (must be 64-char hex = 32 bytes).
 * Falls back to a deterministic key derived from SUPABASE_SERVICE_ROLE_KEY
 * via HKDF so existing deployments without ENCRYPTION_KEY still work.
 */
function getEncryptionKey(): Buffer {
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey) {
        if (envKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(envKey)) {
            throw new Error(
                'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ' +
                'Generate one with: openssl rand -hex 32'
            );
        }
        return Buffer.from(envKey, 'hex');
    }

    // Fallback: derive from service role key so existing deployments don't break
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        throw new Error('Missing ENCRYPTION_KEY and SUPABASE_SERVICE_ROLE_KEY — cannot derive encryption key');
    }

    // HKDF-SHA256 with a fixed salt and info string for deterministic derivation
    return crypto.hkdfSync(
        'sha256',
        serviceRoleKey,
        'checkvibe-pat-encryption-salt',
        'checkvibe-pat-encryption',
        32,
    ) as unknown as Buffer;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string containing: IV (12 bytes) + ciphertext + authTag (16 bytes).
 * The output is prefixed with "enc:" so we can distinguish encrypted values from plaintext.
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Pack as: IV + ciphertext + authTag
    const packed = Buffer.concat([iv, encrypted, authTag]);
    return `enc:${packed.toString('base64')}`;
}

/**
 * Decrypt a value produced by `encrypt()`.
 * Expects the "enc:" prefix followed by base64(IV + ciphertext + authTag).
 *
 * If decryption fails (wrong key, corrupted data, or plaintext legacy value),
 * returns the original value as-is for graceful migration.
 */
export function decrypt(encrypted: string): string {
    // If it doesn't have our prefix, it's a plaintext legacy value — return as-is
    if (!encrypted.startsWith('enc:')) {
        return encrypted;
    }

    try {
        const key = getEncryptionKey();
        const packed = Buffer.from(encrypted.slice(4), 'base64');

        if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
            // Too short to be valid — return raw (should not normally happen)
            return encrypted;
        }

        const iv = packed.subarray(0, IV_LENGTH);
        const authTag = packed.subarray(packed.length - AUTH_TAG_LENGTH);
        const ciphertext = packed.subarray(IV_LENGTH, packed.length - AUTH_TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return decrypted.toString('utf8');
    } catch {
        // Decryption failed — likely a legacy plaintext value or key mismatch.
        // Return as-is for graceful backward compatibility.
        console.warn('Failed to decrypt value — returning as-is (likely legacy plaintext)');
        return encrypted;
    }
}
