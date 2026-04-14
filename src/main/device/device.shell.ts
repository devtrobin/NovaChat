export function resolveShell(command: string): { args: string[]; file: string; shell: string } {
  if (process.platform === "win32") {
    return {
      args: ["/d", "/s", "/c", command],
      file: process.env.ComSpec || "cmd.exe",
      shell: process.env.ComSpec || "cmd.exe",
    };
  }

  const preferredShell = process.env.SHELL || "/bin/zsh";
  return {
    args: ["-lc", command],
    file: preferredShell,
    shell: preferredShell,
  };
}

export function getKillSignal(): NodeJS.Signals | undefined {
  return process.platform === "win32" ? undefined : "SIGTERM";
}
