import { rm, stat } from "node:fs/promises";
import { readJsonFileDetailed, writeJsonFile } from "../chat/chat-storage.io";

type EncryptedCredentialFile = {
  ciphertext: string;
  provider: "electron-safe-storage";
  updatedAt: string;
  version: 1;
};

export type CredentialEncryptionProvider = {
  assertAvailable: () => void;
  decrypt: (encrypted: Buffer) => string;
  encrypt: (plainText: string) => Buffer;
};

export class CredentialStore {
  constructor(
    private readonly filePath: string,
    private readonly encryption: CredentialEncryptionProvider,
  ) {}

  async has(): Promise<boolean> {
    try {
      await stat(this.filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }

  async get(): Promise<string> {
    this.encryption.assertAvailable();
    const result = await readJsonFileDetailed<EncryptedCredentialFile>(this.filePath);
    if (!result.value) return "";
    if (
      result.value.version !== 1
      || result.value.provider !== "electron-safe-storage"
      || typeof result.value.ciphertext !== "string"
    ) {
      throw new Error("Le fichier de secret OpenAI utilise un format invalide.");
    }
    return this.encryption.decrypt(Buffer.from(result.value.ciphertext, "base64"));
  }

  async set(value: string): Promise<void> {
    const normalized = value.trim();
    if (!normalized) throw new Error("La cle API OpenAI ne peut pas etre vide.");
    this.encryption.assertAvailable();
    const encrypted = this.encryption.encrypt(normalized);
    await writeJsonFile(this.filePath, {
      ciphertext: encrypted.toString("base64"),
      provider: "electron-safe-storage",
      updatedAt: new Date().toISOString(),
      version: 1,
    } satisfies EncryptedCredentialFile);
    const verified = await this.get();
    if (verified !== normalized) {
      throw new Error("La verification du secret chiffre a echoue.");
    }
  }

  async clear(): Promise<void> {
    await rm(this.filePath, { force: true });
    await rm(`${this.filePath}.bak`, { force: true });
  }
}
