import { RunningCommand } from "./device.types";

const runningCommands = new Map<string, RunningCommand>();

export function getRunningCommand(commandId: string): RunningCommand | undefined {
  return runningCommands.get(commandId);
}

export function registerRunningCommand(commandId: string, command: RunningCommand): void {
  runningCommands.set(commandId, command);
}

export function unregisterRunningCommand(commandId: string): void {
  runningCommands.delete(commandId);
}
