import path from "node:path";

export type DeviceRuntimeShell = {
  family: "cmd" | "posix";
  file: string;
  name: string;
};

export function getDeviceRuntimeShell(): DeviceRuntimeShell {
  if (process.platform === "win32") {
    return {
      family: "cmd",
      file: process.env.ComSpec || "cmd.exe",
      name: path.basename(process.env.ComSpec || "cmd.exe"),
    };
  }

  const preferredShell = process.env.SHELL || "/bin/zsh";
  return {
    family: "posix",
    file: preferredShell,
    name: path.basename(preferredShell),
  };
}

export function resolveShell(command: string): { args: string[]; file: string; shell: string } {
  const runtime = getDeviceRuntimeShell();
  if (runtime.family === "cmd") {
    return {
      args: ["/d", "/s", "/c", `chcp 65001>nul & ${command}`],
      file: runtime.file,
      shell: runtime.file,
    };
  }

  return {
    args: ["-lc", command],
    file: runtime.file,
    shell: runtime.file,
  };
}
