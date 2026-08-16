import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Criptografia simétrica (AES-256-GCM) para as credenciais do site da SEFIN
 * (usuário/senha) antes de gravar no banco. Nunca gravamos texto puro.
 *
 * A chave mestra vem de NFSE_MASTER_KEY (.env) — uma string longa e
 * aleatória, gerada uma única vez e guardada como segredo do servidor
 * (nunca commitada). Perder essa chave = perder acesso às credenciais
 * salvas (é o comportamento esperado de um cofre).
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT = "nfse-fortaleza-static-salt-v1"; // ok ser fixo: a chave mestra já é o segredo real

function deriveKey(masterKey: string): Buffer {
  return scryptSync(masterKey, SALT, 32);
}

function getMasterKey(): string {
  const key = process.env.NFSE_MASTER_KEY;
  if (!key || key.length < 16) {
    throw new Error(
      "NFSE_MASTER_KEY ausente ou curta demais. Defina uma string aleatória de pelo menos 32 caracteres no .env " +
        "(ex.: gere com `openssl rand -base64 32`).",
    );
  }
  return key;
}

/** Retorna um único texto opaco "iv:tag:ciphertext" em base64, pronto para salvar numa coluna String. */
export function encryptSecret(plainText: string): string {
  const key = deriveKey(getMasterKey());
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Payload criptografado em formato inválido.");
  }
  const key = deriveKey(getMasterKey());
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
