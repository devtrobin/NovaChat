export const MAX_AEL_FILE_BYTES = 128 * 1024;

export type AELWriteFileOperation = {
  action: "write-file";
  target: { directory: "desktop" | "workspace"; name: string };
  content: string;
  overwrite: false;
};

export type FileWritePreview = {
  path: string;
  content: string;
  byteLength: number;
  sha256: string;
};
