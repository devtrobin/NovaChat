import {
  AELCommandResult,
  StartedAELCommand,
} from "../../shared/chat.types";
import { AELExecutionSettings } from "../../shared/settings.types";
import { assertCommandAllowed, normalizeCommand } from "./ael.policy";
import { buildProgress } from "./ael.progress";
import { getRunningCommand } from "./ael.registry";
import { createMissingCommandResult, createStartedCommand } from "./ael.results";
import {
  bindCommandLifecycle,
  bindProgressTracking,
  createRunningCommand,
  resumeCommandTimeout,
  spawnAELProcess,
  terminateRunningCommand,
} from "./ael.runtime";
import { resolveShell } from "./ael.shell";
import { ProgressListener } from "./ael.types";
export { AELPolicyError } from "./ael.types";

export function startAELCommand(
  command: string,
  options: AELExecutionSettings,
  onProgress?: ProgressListener,
): StartedAELCommand {
  const commandId = crypto.randomUUID();
  const normalizedCommand = normalizeCommand(command);
  assertCommandAllowed(normalizedCommand);
  const shell = resolveShell(normalizedCommand);
  const cwd = process.cwd();
  const child = spawnAELProcess(shell.file, shell.args, cwd);
  const runningCommand = createRunningCommand(
    child,
    cwd,
    normalizedCommand,
    shell.shell,
    commandId,
    options,
    onProgress,
  );
  bindProgressTracking(commandId, runningCommand);
  bindCommandLifecycle(commandId, runningCommand);
  return createStartedCommand(commandId, cwd, normalizedCommand, shell.shell);
}

export async function awaitAELCommand(commandId: string): Promise<AELCommandResult> {
  const runningCommand = getRunningCommand(commandId);
  if (!runningCommand) return createMissingCommandResult(commandId);

  return runningCommand.promise;
}

export async function killAELCommand(commandId: string): Promise<void> {
  const runningCommand = getRunningCommand(commandId);
  if (!runningCommand) return;
  await terminateRunningCommand(runningCommand);
}

export async function submitInputToCommand(commandId: string, value: string): Promise<boolean> {
  const runningCommand = getRunningCommand(commandId);
  if (
    !runningCommand?.awaitingInput
    || !runningCommand.child.stdin
    || runningCommand.child.stdin.destroyed
    || !runningCommand.child.stdin.writable
  ) return false;

  runningCommand.awaitingInput = false;
  runningCommand.inputPlaceholder = undefined;
  runningCommand.inputSecret = undefined;
  runningCommand.onProgress?.(buildProgress(commandId, runningCommand));
  resumeCommandTimeout(runningCommand);
  try {
    runningCommand.child.stdin.write(`${value}\n`);
    return true;
  } catch {
    return false;
  }
}
