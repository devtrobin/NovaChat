export type StorageIssueKind = "invalid-json" | "io-error" | "missing-indexed-data";

export type StorageIssue = {
  at: string;
  backupPath?: string;
  filePath: string;
  kind: StorageIssueKind;
  message: string;
  recoveredFromBackup: boolean;
};

export type StorageReadResult<T> = {
  issues: StorageIssue[];
  status: "invalid" | "missing" | "ok" | "recovered";
  value: T | null;
};
