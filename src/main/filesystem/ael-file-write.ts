import { lstat, open, realpath, stat, link, unlink } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { FileWritePreview } from "../../shared/ael-file.types";
import { parseAELWriteFileOperation } from "../validation/ael-file.validation";

type Directories = { desktop: string; workspace: string; protectedPaths: string[] };
type PreparedState = { directory: string; canonical: string; dev: bigint; ino: bigint; bytes: Buffer };
export type PreparedFileWrite = Readonly<FileWritePreview>;
export type FileWriteResult = { path: string; byteLength: number; sha256: string; verified: true; warnings: string[] };
const preparedWrites = new WeakMap<PreparedFileWrite, PreparedState>();

export class AELFileWriteError extends Error {
  constructor(message: string, public readonly createdPath?: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AELFileWriteError";
  }
}

export async function prepareFileWrite(value: unknown, directories: Directories): Promise<PreparedFileWrite> {
  const operation = parseAELWriteFileOperation(value);
  const directory = directories[operation.target.directory];
  if (!path.isAbsolute(directory)) throw new AELFileWriteError("Le dossier cible doit etre resolu par le main.");
  const canonical = await realpath(directory);
  const identity = await stat(canonical, { bigint: true });
  if (!identity.isDirectory()) throw new AELFileWriteError("Le dossier cible est indisponible.");
  const target = path.join(canonical, operation.target.name);
  for (const protectedPath of directories.protectedPaths) {
    const resolved = path.resolve(protectedPath);
    const actual = await canonicalizeProtectedPath(resolved);
    if (within(path.join(directory, operation.target.name), resolved) || within(target, actual)) {
      throw new AELFileWriteError("Cette cible appartient aux donnees ou artefacts internes de NovaChat.");
    }
  }
  await assertMissing(target);
  const bytes = Buffer.from(operation.content, "utf8");
  const preview = Object.freeze({ path: target, content: operation.content, byteLength: bytes.length, sha256: digest(bytes) });
  preparedWrites.set(preview, { directory, canonical, dev: identity.dev, ino: identity.ino, bytes });
  return preview;
}

// Only a main-owned preparation can be consumed, once, after permission.
// Publish the complete file with link(): an existing entry is never replaced.
export async function executeFileWrite(preview: PreparedFileWrite, signal: AbortSignal): Promise<FileWriteResult> {
  const state = preparedWrites.get(preview);
  if (!state) throw new AELFileWriteError("Preparation d'ecriture inconnue ou deja consommee.");
  preparedWrites.delete(preview);
  signal.throwIfAborted();
  await checkDirectory(state);
  await assertMissing(preview.path);
  const temporary = path.join(state.canonical, `.novachat-write-${randomUUID()}.tmp`);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  let ownedIdentity: { dev: bigint; ino: bigint } | undefined;
  let published = false;
  let result: FileWriteResult | undefined;
  let failure: Error | undefined;
  try {
    handle = await open(temporary, "wx+", 0o600);
    ownedIdentity = await handle.stat({ bigint: true });
    await handle.writeFile(state.bytes, { signal });
    await handle.sync();
    const identity = await handle.stat({ bigint: true });
    await checkDirectory(state);
    signal.throwIfAborted();
    await checkFileIdentity(temporary, identity, state.bytes.length);
    await link(temporary, preview.path);
    published = true;
    // Once committed, finish the bounded verification even if Stop arrives.
    await checkFileIdentity(preview.path, identity, state.bytes.length);
    const bytes = Buffer.alloc(state.bytes.length + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const read = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (read.bytesRead === 0) break;
      offset += read.bytesRead;
    }
    if (!bytes.subarray(0, offset).equals(state.bytes)) throw new Error("La relecture ne correspond pas au contenu autorise.");
    await checkFileIdentity(preview.path, identity, state.bytes.length);
    result = { path: preview.path, byteLength: state.bytes.length, sha256: preview.sha256, verified: true, warnings: [] };
  } catch (error) {
    if (!published && signal.aborted) failure = new DOMException("Ecriture interrompue.", "AbortError");
    else failure = new AELFileWriteError(
      published
        ? "Le fichier a ete cree, mais sa verification a echoue. Verifiez son contenu."
        : (error as NodeJS.ErrnoException).code === "EEXIST"
          ? "Un fichier existe deja : il a ete conserve."
          : "Creation impossible ; verifiez les droits et la prise en charge des liens physiques du dossier cible.",
      published ? preview.path : undefined,
      error,
    );
  } finally {
    await handle?.close().catch(() => undefined);
    try {
      if (ownedIdentity) {
        const actual = await lstat(temporary, { bigint: true });
        if (actual.dev === ownedIdentity.dev && actual.ino === ownedIdentity.ino && actual.isFile()) await unlink(temporary);
        else {
          const warning = `Fichier temporaire modifie, a verifier : ${temporary}`;
          if (failure) failure.message += ` ${warning}`;
          else result?.warnings.push(warning);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        const warning = `Fichier temporaire a nettoyer : ${temporary}`;
        if (failure) failure.message += ` ${warning}`;
        else result?.warnings.push(warning);
      }
    }
  }
  if (failure) throw failure;
  if (!result) throw new AELFileWriteError("Aucun resultat d'ecriture disponible.");
  if (signal.aborted) result.warnings.push("Arret recu apres la creation du fichier.");
  return result;
}

async function checkFileIdentity(target: string, identity: { dev: bigint; ino: bigint }, size: number): Promise<void> {
  const actual = await lstat(target, { bigint: true });
  if (!actual.isFile() || actual.dev !== identity.dev || actual.ino !== identity.ino || actual.size !== BigInt(size)) {
    throw new Error("Identite du fichier modifiee pendant la verification.");
  }
}

async function assertMissing(target: string): Promise<void> {
  try { await lstat(target); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  throw new AELFileWriteError("Un fichier ou une entree existe deja : il a ete conserve. Choisissez un autre nom.");
}

async function checkDirectory(state: PreparedState): Promise<void> {
  const canonical = await realpath(state.directory);
  const actual = await stat(canonical, { bigint: true });
  if (canonical !== state.canonical || actual.dev !== state.dev || actual.ino !== state.ino) {
    throw new AELFileWriteError("Le dossier cible a change depuis la demande de permission.");
  }
}

function within(target: string, root: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

async function canonicalizeProtectedPath(target: string): Promise<string> {
  try { return await realpath(target); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const parent = path.dirname(target);
    if (parent === target) throw error;
    return path.join(await canonicalizeProtectedPath(parent), path.basename(target));
  }
}

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
