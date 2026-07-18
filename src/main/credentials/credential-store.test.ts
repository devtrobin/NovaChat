import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CredentialEncryptionProvider,
  CredentialStore,
} from "./credential-store";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0)
    .map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("credential store", () => {
  it("encrypts, replaces and clears the OpenAI key without persisting plaintext", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = path.join(directory, "secrets", "openai-api-key.json");
    const store = new CredentialStore(filePath, createTestEncryptionProvider());

    await store.set("sk-first-secret");
    expect(await store.get()).toBe("sk-first-secret");
    expect(await store.has()).toBe(true);
    expect(await readFile(filePath, "utf8")).not.toContain("sk-first-secret");

    await store.set("sk-replacement-secret");
    expect(await store.get()).toBe("sk-replacement-secret");
    expect(await readFile(filePath, "utf8")).not.toContain("sk-replacement-secret");

    await store.clear();
    expect(await store.has()).toBe(false);
    expect(await store.get()).toBe("");
  });

  it("fails closed when encryption is unavailable", async () => {
    const directory = await createTemporaryDirectory();
    const store = new CredentialStore(
      path.join(directory, "secret.json"),
      {
        assertAvailable: () => {
          throw new Error("vault unavailable");
        },
        decrypt: () => "",
        encrypt: () => Buffer.alloc(0),
      },
    );

    await expect(store.set("sk-must-remain-private")).rejects.toThrow("vault unavailable");
    expect(await store.has()).toBe(false);
  });
});

function createTestEncryptionProvider(): CredentialEncryptionProvider {
  return {
    assertAvailable: () => undefined,
    decrypt: (encrypted) => Buffer.from(encrypted.toString("utf8"), "base64").toString("utf8"),
    encrypt: (plainText) => Buffer.from(Buffer.from(plainText, "utf8").toString("base64"), "utf8"),
  };
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "novachat-credentials-"));
  temporaryDirectories.push(directory);
  return directory;
}
