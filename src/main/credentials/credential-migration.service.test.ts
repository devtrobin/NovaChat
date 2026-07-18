import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeJsonFile } from "../chat/chat-storage.io";
import {
  CredentialEncryptionProvider,
  CredentialStore,
} from "./credential-store";
import { migratePlaintextOpenAIKey } from "./credential-migration.service";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0)
    .map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("OpenAI credential migration", () => {
  it("moves a plaintext key to encrypted storage and sanitizes settings backups", async () => {
    const directory = await createTemporaryDirectory();
    const settingsPath = path.join(directory, "settings.json");
    const secretPath = path.join(directory, "secrets", "openai.json");
    const store = new CredentialStore(secretPath, createTestEncryptionProvider());
    const settings = {
      localFiles: { settingsPath },
      openai: {
        apiKey: "sk-legacy-plaintext",
        baseUrl: "https://api.openai.com/v1",
      },
    };
    await writeJsonFile(settingsPath, settings);
    await writeJsonFile(settingsPath, settings);

    const first = await migratePlaintextOpenAIKey(store, [settingsPath]);
    const second = await migratePlaintextOpenAIKey(store, [settingsPath]);

    expect(first).toEqual({ migrated: true, sanitizedFiles: [settingsPath] });
    expect(second).toEqual({ migrated: false, sanitizedFiles: [] });
    expect(await store.get()).toBe("sk-legacy-plaintext");
    expect(await readFile(secretPath, "utf8")).not.toContain("sk-legacy-plaintext");
    for (const filePath of [settingsPath, `${settingsPath}.bak`]) {
      const content = await readFile(filePath, "utf8");
      expect(content).not.toContain("sk-legacy-plaintext");
      expect(JSON.parse(content).openai).toMatchObject({ apiKeyConfigured: true });
      expect(JSON.parse(content).openai).not.toHaveProperty("apiKey");
    }
  });

  it("keeps plaintext settings intact if the secure write cannot be verified", async () => {
    const directory = await createTemporaryDirectory();
    const settingsPath = path.join(directory, "settings.json");
    await writeJsonFile(settingsPath, {
      openai: { apiKey: "sk-preserved-on-failure" },
    });
    const store = new CredentialStore(
      path.join(directory, "secret.json"),
      {
        assertAvailable: () => undefined,
        decrypt: () => "different-value",
        encrypt: () => Buffer.from("encrypted"),
      },
    );

    await expect(migratePlaintextOpenAIKey(store, [settingsPath]))
      .rejects.toThrow("verification du secret chiffre");
    expect(await readFile(settingsPath, "utf8")).toContain("sk-preserved-on-failure");
  });
});

function createTestEncryptionProvider(): CredentialEncryptionProvider {
  return {
    assertAvailable: () => undefined,
    decrypt: (encrypted: Buffer) => Buffer.from(encrypted.toString("utf8"), "base64").toString("utf8"),
    encrypt: (plainText: string) => Buffer.from(Buffer.from(plainText, "utf8").toString("base64"), "utf8"),
  };
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "novachat-credential-migration-"));
  temporaryDirectories.push(directory);
  return directory;
}
