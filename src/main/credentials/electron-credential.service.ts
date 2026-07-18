import { app, safeStorage } from "electron";
import path from "node:path";
import { CredentialStore } from "./credential-store";

let openAICredentialStore: CredentialStore | null = null;

export function getOpenAICredentialStore(): CredentialStore {
  if (!openAICredentialStore) {
    openAICredentialStore = new CredentialStore(
      path.join(app.getPath("userData"), "secrets", "openai-api-key.json"),
      {
        assertAvailable: assertSafeStorageAvailable,
        decrypt: (encrypted) => safeStorage.decryptString(encrypted),
        encrypt: (plainText) => safeStorage.encryptString(plainText),
      },
    );
  }
  return openAICredentialStore;
}

export function resetOpenAICredentialStore(): void {
  openAICredentialStore = null;
}

function assertSafeStorageAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Le coffre de secrets du systeme n'est pas disponible.");
  }
  if (process.platform === "linux" && safeStorage.getSelectedStorageBackend() === "basic_text") {
    throw new Error("Le backend Linux basic_text n'est pas accepte pour stocker une cle API.");
  }
}
