import { ChildProcess } from "node:child_process";
import {
  DeviceCommandProgress,
  DeviceCommandResult,
} from "../../renderer/types/chat.types";

export type ProgressListener = (progress: DeviceCommandProgress) => void;

export type RunningCommand = {
  awaitingInput: boolean;
  child: ChildProcess;
  cwd: string;
  inputPlaceholder?: string;
  inputSecret?: boolean;
  normalizedCommand: string;
  onProgress?: ProgressListener;
  output: string;
  promise: Promise<DeviceCommandResult>;
  shell: string;
  startedAt: number;
  timedOut: boolean;
  wasKilled: boolean;
};

export class DevicePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DevicePolicyError";
  }
}
