import { ChildProcess } from "node:child_process";
import {
  DeviceCommandProgress,
  DeviceCommandResult,
} from "../../shared/chat.types";
import { BoundedOutputBuffer } from "./device.output-buffer";

export type ProgressListener = (progress: DeviceCommandProgress) => void;

export type RunningCommand = {
  awaitingInput: boolean;
  child: ChildProcess;
  cwd: string;
  inputPlaceholder?: string;
  inputSecret?: boolean;
  normalizedCommand: string;
  onProgress?: ProgressListener;
  output: BoundedOutputBuffer;
  promise: Promise<DeviceCommandResult>;
  settled: boolean;
  shell: string;
  startedAt: number;
  timeoutHandle?: ReturnType<typeof setTimeout>;
  timeoutMs: number;
  timedOut: boolean;
  wasKilled: boolean;
};

export class DevicePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DevicePolicyError";
  }
}
