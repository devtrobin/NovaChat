import {
  DeviceCommandResult,
  StartedDeviceCommand,
} from "../../renderer/types/chat.types";
import { assertCommandAllowed, normalizeCommand } from "./device.policy";
import { buildProgress } from "./device.progress";
import { getRunningCommand } from "./device.registry";
import { createMissingCommandResult, createStartedCommand } from "./device.results";
import {
  bindCommandLifecycle,
  bindProgressTracking,
  createRunningCommand,
  spawnDeviceProcess,
} from "./device.runtime";
import { getKillSignal, resolveShell } from "./device.shell";
import { ProgressListener } from "./device.types";
export { DevicePolicyError } from "./device.types";

export function startDeviceCommand(
  command: string,
  onProgress?: ProgressListener,
): StartedDeviceCommand {
  const commandId = crypto.randomUUID();
  const normalizedCommand = normalizeCommand(command);
  assertCommandAllowed(normalizedCommand);
  const shell = resolveShell(normalizedCommand);
  const cwd = process.cwd();
  const child = spawnDeviceProcess(shell.file, shell.args, cwd);
  const runningCommand = createRunningCommand(child, cwd, normalizedCommand, shell.shell, commandId, onProgress);
  bindProgressTracking(commandId, runningCommand);
  bindCommandLifecycle(commandId, runningCommand);
  return createStartedCommand(commandId, cwd, normalizedCommand, shell.shell);
}

export async function awaitDeviceCommand(commandId: string): Promise<DeviceCommandResult> {
  const runningCommand = getRunningCommand(commandId);
  if (!runningCommand) return createMissingCommandResult(commandId);

  return runningCommand.promise;
}

export async function killDeviceCommand(commandId: string): Promise<void> {
  const runningCommand = getRunningCommand(commandId);
  if (!runningCommand) return;
  runningCommand.child.kill(getKillSignal());
}

export async function submitInputToCommand(commandId: string, value: string): Promise<boolean> {
  const runningCommand = getRunningCommand(commandId);
  if (!runningCommand?.child.stdin) return false;

  runningCommand.awaitingInput = false;
  runningCommand.inputPlaceholder = undefined;
  runningCommand.inputSecret = undefined;
  runningCommand.onProgress?.(buildProgress(commandId, runningCommand));
  runningCommand.child.stdin.write(`${value}\n`);
  return true;
}
