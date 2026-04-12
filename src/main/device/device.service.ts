import { ChildProcess, spawn } from "node:child_process";
import { DeviceCommandResult, StartedDeviceCommand } from "../../renderer/types/chat.types";

type RunningCommand = {
  child: ChildProcess;
  promise: Promise<DeviceCommandResult>;
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

export function startDeviceCommand(command: string): StartedDeviceCommand {
  const commandId = crypto.randomUUID();
  const shell = resolveShell(command);
  const child = spawn(shell.file, shell.args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let wasKilled = false;

  child.stdout?.on("data", (chunk: Buffer | string) => {
    stdout += chunk.toString();
  });

  child.stderr?.on("data", (chunk: Buffer | string) => {
    stderr += chunk.toString();
  });

  const promise = new Promise<DeviceCommandResult>((resolve) => {
    child.on("close", (code) => {
      runningCommands.delete(commandId);
      const output = [stdout, stderr].filter(Boolean).join("").trim()
        || (wasKilled ? "Commande interrompue." : "Commande terminee sans sortie.");

      resolve({
        code: typeof code === "number" ? code : (wasKilled ? 130 : 1),
        commandId,
        ok: !wasKilled && code === 0,
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
    wasKilled = true;
    child.kill(getKillSignal());
  }, 15000);

  promise.finally(() => globalThis.clearTimeout(timeout));

  const originalKill = child.kill.bind(child);
  child.kill = ((signal?: NodeJS.Signals | number) => {
    wasKilled = true;
    return originalKill(signal);
  }) as ChildProcess["kill"];

  runningCommands.set(commandId, { child, promise });
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
