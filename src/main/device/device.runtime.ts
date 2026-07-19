import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { DeviceCommandResult } from "../../shared/chat.types";
import { DeviceExecutionSettings } from "../../shared/settings.types";
import { BoundedOutputBuffer } from "./device.output-buffer";
import { buildProgress, detectInputRequest } from "./device.progress";
import { terminateProcessTree } from "./device.process-tree";
import { registerRunningCommand, unregisterRunningCommand } from "./device.registry";
import { createPendingCommandResult } from "./device.results";
import { RunningCommand } from "./device.types";

export function spawnDeviceProcess(file: string, args: string[], cwd: string): ChildProcess {
  return spawn(file, args, {
    cwd,
    detached: process.platform !== "win32",
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
}

export function createRunningCommand(
  child: ChildProcess,
  cwd: string,
  normalizedCommand: string,
  shell: string,
  commandId: string,
  options: DeviceExecutionSettings,
  onProgress?: RunningCommand["onProgress"],
): RunningCommand {
  return {
    awaitingInput: false,
    child,
    cwd,
    normalizedCommand,
    onProgress,
    output: new BoundedOutputBuffer(options.maxOutputCharacters),
    promise: Promise.resolve(createPendingCommandResult(commandId, cwd, normalizedCommand, shell)),
    settled: false,
    shell,
    startedAt: Date.now(),
    timeoutMs: options.timeoutMs,
    timedOut: false,
    wasKilled: false,
  };
}

export function bindProgressTracking(commandId: string, runningCommand: RunningCommand): void {
  const notify = () => {
    runningCommand.onProgress?.(buildProgress(commandId, runningCommand));
  };

  const appendOutput = (chunk: Buffer | string) => {
    const wasAwaitingInput = runningCommand.awaitingInput;
    runningCommand.output.append(chunk);
    const nextState = detectInputRequest(runningCommand.output.toString());
    runningCommand.awaitingInput = nextState.awaitingInput;
    runningCommand.inputPlaceholder = nextState.inputPlaceholder;
    runningCommand.inputSecret = nextState.inputSecret;
    if (!wasAwaitingInput && nextState.awaitingInput) {
      pauseCommandTimeout(runningCommand);
    } else if (wasAwaitingInput && !nextState.awaitingInput) {
      resumeCommandTimeout(runningCommand);
    }
    notify();
  };

  runningCommand.child.stdout?.on("data", appendOutput);
  runningCommand.child.stderr?.on("data", appendOutput);
}

export function bindCommandLifecycle(commandId: string, runningCommand: RunningCommand): void {
  runningCommand.promise = new Promise<DeviceCommandResult>((resolve) => {
    const finish = (result: DeviceCommandResult) => {
      if (runningCommand.settled) return;
      runningCommand.settled = true;
      pauseCommandTimeout(runningCommand);
      unregisterRunningCommand(commandId);
      resolve(result);
    };

    runningCommand.child.on("close", (code, signal) => {
      runningCommand.output.finish();
      const output = runningCommand.output.toString().trim()
        || (runningCommand.wasKilled ? "Commande interrompue." : "Commande terminee sans sortie.");
      const durationMs = Date.now() - runningCommand.startedAt;
      const resolvedCode = runningCommand.wasKilled ? 130 : (typeof code === "number" ? code : 1);

      finish({
        code: resolvedCode,
        commandId,
        cwd: runningCommand.cwd,
        durationMs,
        errorType: runningCommand.timedOut
          ? "timeout"
          : runningCommand.wasKilled
            ? "killed"
            : resolvedCode === 127
              ? "not-found"
              : resolvedCode === 0
                ? undefined
                : "shell",
        normalizedCommand: runningCommand.normalizedCommand,
        ok: !runningCommand.wasKilled && code === 0,
        output,
        shell: runningCommand.shell,
        signal,
      });
    });

    runningCommand.child.on("error", (error: Error) => {
      runningCommand.output.append(error.message);
      runningCommand.output.finish();
      finish({
        code: runningCommand.wasKilled ? 130 : 1,
        commandId,
        cwd: runningCommand.cwd,
        durationMs: Date.now() - runningCommand.startedAt,
        errorType: runningCommand.timedOut
          ? "timeout"
          : runningCommand.wasKilled
            ? "killed"
            : "shell",
        normalizedCommand: runningCommand.normalizedCommand,
        ok: false,
        output: runningCommand.output.toString(),
        shell: runningCommand.shell,
        signal: null,
      });
    });
  });

  registerRunningCommand(commandId, runningCommand);
  resumeCommandTimeout(runningCommand);
}

export function pauseCommandTimeout(runningCommand: RunningCommand): void {
  if (runningCommand.timeoutHandle === undefined) return;
  globalThis.clearTimeout(runningCommand.timeoutHandle);
  runningCommand.timeoutHandle = undefined;
}

export function resumeCommandTimeout(runningCommand: RunningCommand): void {
  pauseCommandTimeout(runningCommand);
  if (runningCommand.awaitingInput || runningCommand.settled) return;
  runningCommand.timeoutHandle = globalThis.setTimeout(() => {
    void terminateRunningCommand(runningCommand, true).catch(() => {
      try {
        runningCommand.child.kill();
      } catch {
        runningCommand.output.append("Impossible d'interrompre le processus apres le delai.");
      }
    });
  }, runningCommand.timeoutMs);
}

export async function terminateRunningCommand(
  runningCommand: RunningCommand,
  timedOut = false,
): Promise<void> {
  if (runningCommand.settled || runningCommand.wasKilled) return;
  runningCommand.timedOut = timedOut;
  runningCommand.wasKilled = true;
  pauseCommandTimeout(runningCommand);
  await terminateProcessTree(runningCommand.child);
}
