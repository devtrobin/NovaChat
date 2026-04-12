export type BootTask = {
  id: string;
  label: string;
  run: () => Promise<void>;
  errorMessage?: string;
  timeoutMs?: number;
};
