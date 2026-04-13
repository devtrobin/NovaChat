import { ChildProcess, spawn } from "node:child_process";
import {
  DeviceCommandProgress,
  DeviceCommandResult,
  StartedDeviceCommand,
} from "../../renderer/types/chat.types";

type ProgressListener = (progress: DeviceCommandProgress) => void;

type RunningCommand = {
  awaitingInput: boolean;
  child: ChildProcess;
  inputPlaceholder?: string;
  inputSecret?: boolean;
  onProgress?: ProgressListener;
  output: string;
  promise: Promise<DeviceCommandResult>;
  wasKilled: boolean;
};

const runningCommands = new Map<string, RunningCommand>();

function resolveShell(command: string): { file: string; args: string[] } {
  if (process.platform === "win32") {
    return {
      args: ["/d", "/s", "/c", command],
      file: process.env.ComSpec || "cmd.exe",
    };
  }

  const preferredShell = process.env.SHELL || "/bin/zsh";
  return {
    args: ["-lc", command],
    file: preferredShell,
  };
}

function getKillSignal(): NodeJS.Signals | undefined {
  return process.platform === "win32" ? undefined : "SIGTERM";
}

function detectInputRequest(output: string): { awaitingInput: boolean; inputPlaceholder?: string; inputSecret?: boolean } {
  const trimmed = output.trimEnd();

  if (/(?:password|mot de passe|passphrase)[^:\n\r]{0,60}:\s*$/i.test(trimmed)) {
    return {
      awaitingInput: true,
      inputPlaceholder: "Entrez le mot de passe",
      inputSecret: true,
    };
  }

  if (/[?:]\s*$/.test(trimmed)) {
    return {
      awaitingInput: true,
      inputPlaceholder: "Entrez la valeur demandee",
      inputSecret: false,
    };
  }

  return {
    awaitingInput: false,
  };
}

function buildProgress(commandId: string, command: RunningCommand): DeviceCommandProgress {
  return {
    awaitingInput: command.awaitingInput,
    commandId,
    inputPlaceholder: command.inputPlaceholder,
    inputSecret: command.inputSecret,
    output: command.output.trimEnd(),
  };
}

export function startDeviceCommand(
  command: string,
  onProgress?: ProgressListener,
): StartedDeviceCommand {
  const commandId = crypto.randomUUID();
  const shell = resolveShell(command);
  const child = spawn(shell.file, shell.args, {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });

  const runningCommand: RunningCommand = {
    awaitingInput: false,
    child,
    onProgress,
    output: "",
    promise: Promise.resolve({
      code: 1,
      commandId,
      ok: false,
      output: "",
    }),
    wasKilled: false,
  };

  const notify = () => {
    runningCommand.onProgress?.(buildProgress(commandId, runningCommand));
  };

  const appendOutput = (chunk: Buffer | string) => {
    runningCommand.output += chunk.toString();
    const nextState = detectInputRequest(runningCommand.output);
    runningCommand.awaitingInput = nextState.awaitingInput;
    runningCommand.inputPlaceholder = nextState.inputPlaceholder;
    runningCommand.inputSecret = nextState.inputSecret;
    notify();
  };

  child.stdout?.on("data", appendOutput);
  child.stderr?.on("data", appendOutput);

  runningCommand.promise = new Promise<DeviceCommandResult>((resolve) => {
    child.on("close", (code) => {
      runningCommands.delete(commandId);
      const output = runningCommand.output.trim()
        || (runningCommand.wasKilled ? "Commande interrompue." : "Commande terminee sans sortie.");

      resolve({
        code: typeof code === "number" ? code : (runningCommand.wasKilled ? 130 : 1),
        commandId,
        ok: !runningCommand.wasKilled && code === 0,
        output,
      });
    });

    child.on("error", (error: Error) => {
      runningCommands.delete(commandId);
      resolve({
        code: 1,
        commandId,
        ok: false,
        output: error.message,
      });
    });
  });

  const timeout = globalThis.setTimeout(() => {
    if (child.killed) return;
    runningCommand.wasKilled = true;
    child.kill(getKillSignal());
  }, 15000);

  runningCommand.promise.finally(() => globalThis.clearTimeout(timeout));

  const originalKill = child.kill.bind(child);
  child.kill = ((signal?: NodeJS.Signals | number) => {
    runningCommand.wasKilled = true;
    return originalKill(signal);
  }) as ChildProcess["kill"];

  runningCommands.set(commandId, runningCommand);
  return { commandId };
}

export async function awaitDeviceCommand(commandId: string): Promise<DeviceCommandResult> {
  const runningCommand = runningCommands.get(commandId);
  if (!runningCommand) {
    return {
      code: 1,
      commandId,
      ok: false,
      output: "Commande introuvable ou deja terminee.",
    };
  }

  return runningCommand.promise;
}

export async function killDeviceCommand(commandId: string): Promise<void> {
  const runningCommand = runningCommands.get(commandId);
  if (!runningCommand) return;
  runningCommand.child.kill(getKillSignal());
}

export async function submitInputToCommand(commandId: string, value: string): Promise<boolean> {
  const runningCommand = runningCommands.get(commandId);
  if (!runningCommand?.child.stdin) return false;

  runningCommand.awaitingInput = false;
  runningCommand.inputPlaceholder = undefined;
  runningCommand.inputSecret = undefined;
  runningCommand.onProgress?.(buildProgress(commandId, runningCommand));
  runningCommand.child.stdin.write(`${value}\n`);
  return true;
}
