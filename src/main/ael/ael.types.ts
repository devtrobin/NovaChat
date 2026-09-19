import { ChildProcess } from "node:child_process";
import {
  AELCommandProgress,
  AELCommandResult,
} from "../../shared/chat.types";
import { BoundedOutputBuffer } from "./ael.output-buffer";

export type ProgressListener = (progress: AELCommandProgress) => void;

export type RunningCommand = {
  awaitingInput: boolean;
  child: ChildProcess;
  cwd: string;
  inputPlaceholder?: string;
  inputSecret?: boolean;
  normalizedCommand: string;
  onProgress?: ProgressListener;
  output: BoundedOutputBuffer;
  promise: Promise<AELCommandResult>;
  settled: boolean;
  shell: string;
  startedAt: number;
  timeoutHandle?: ReturnType<typeof setTimeout>;
  timeoutMs: number;
  timedOut: boolean;
  wasKilled: boolean;
};

export class AELPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AELPolicyError";
  }
}
