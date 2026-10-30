import { createHash } from "node:crypto";
import path from "node:path";
import { AELWriteFileOperation, FileWritePreview, MAX_AEL_FILE_BYTES } from "../../shared/ael-file.types";
import { InvalidIpcPayloadError, readEnum, readRecord, readString } from "./ipc-payload.validation.primitives";

export function parseAELWriteFileOperation(value: unknown): AELWriteFileOperation {
  const operation = readRecord(value, "fileWrite");
  assertFields(operation, ["action", "target", "content", "overwrite"]);
  if (operation.action !== "write-file" || operation.overwrite !== false) invalid();
  const target = readRecord(operation.target, "fileWrite.target");
  assertFields(target, ["directory", "name"]);
  const name = readString(target.name, "fileWrite.target.name", 1, 240);
  if (name !== name.trim() || name === "." || name === ".."
    || /[\\/:*?"<>|]/.test(name) || /[. ]$/.test(name)
    || [...name].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
    || /^(?:con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:[. ]|$)/i.test(name)
    || Buffer.byteLength(name, "utf8") > 240 || Buffer.from(name, "utf8").toString("utf8") !== name) invalid();
  const content = readString(operation.content, "fileWrite.content", 0, MAX_AEL_FILE_BYTES);
  if (content.includes("\0") || Buffer.byteLength(content, "utf8") > MAX_AEL_FILE_BYTES
    || Buffer.from(content, "utf8").toString("utf8") !== content) invalid();
  return {
    action: "write-file",
    target: { directory: readEnum(target.directory, "fileWrite.target.directory", ["desktop", "workspace"]), name },
    content,
    overwrite: false,
  };
}

// A persisted preview is display data, never authority to perform a write.
export function parseFileWritePreview(value: unknown): FileWritePreview {
  const preview = readRecord(value, "fileWritePreview");
  assertFields(preview, ["path", "content", "byteLength", "sha256"]);
  const target = readString(preview.path, "fileWritePreview.path", 1, 32_768);
  const content = readString(preview.content, "fileWritePreview.content", 0, MAX_AEL_FILE_BYTES);
  const bytes = Buffer.from(content, "utf8");
  if (!path.isAbsolute(target) || target.includes("\0") || bytes.length > MAX_AEL_FILE_BYTES
    || bytes.toString("utf8") !== content || content.includes("\0")
    || preview.byteLength !== bytes.length
    || preview.sha256 !== createHash("sha256").update(bytes).digest("hex")) invalid();
  return { path: target, content, byteLength: bytes.length, sha256: preview.sha256 as string };
}

function assertFields(record: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(record).some((key) => !allowed.includes(key))) invalid();
}

function invalid(): never {
  throw new InvalidIpcPayloadError("fileWrite", "creation de fichier invalide : cible simple et overwrite:false requis");
}
