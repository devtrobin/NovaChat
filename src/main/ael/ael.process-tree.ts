import { ChildProcess, spawn } from "node:child_process";

export type ProcessTreeTerminationStrategy =
  | {
    args: string[];
    file: "taskkill";
    kind: "command";
  }
  | {
    kind: "process-group";
    pid: number;
    signal: "SIGTERM";
  };

export function resolveProcessTreeTerminationStrategy(
  platform: NodeJS.Platform,
  pid: number,
): ProcessTreeTerminationStrategy {
  if (platform === "win32") {
    return {
      args: ["/pid", String(pid), "/t", "/f"],
      file: "taskkill",
      kind: "command",
    };
  }

  return {
    kind: "process-group",
    pid: -pid,
    signal: "SIGTERM",
  };
}

export async function terminateProcessTree(child: ChildProcess): Promise<void> {
  if (typeof child.exitCode === "number") return;

  const pid = child.pid;
  if (!pid) {
    child.kill(process.platform === "win32" ? undefined : "SIGTERM");
    return;
  }

  const strategy = resolveProcessTreeTerminationStrategy(process.platform, pid);
  if (strategy.kind === "command") {
    const terminated = await runTaskkill(strategy.file, strategy.args);
    if (!terminated && typeof child.exitCode !== "number") {
      child.kill();
    }
    return;
  }

  try {
    process.kill(strategy.pid, strategy.signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
      child.kill(strategy.signal);
    }
  }
}

function runTaskkill(file: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const taskkill = spawn(file, args, {
      stdio: "ignore",
      windowsHide: true,
    });
    let settled = false;
    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    taskkill.once("error", () => finish(false));
    taskkill.once("close", (code) => finish(code === 0));
  });
}
