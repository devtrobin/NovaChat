import { createAgentRuntimeContext } from "./agent-prompt.service";
import { loadAgentWorkspace } from "./agent-storage.service";
import { RunAgentTaskArgs } from "./agent-task.types";
import { registerAbortController, unregisterAbortController } from "../ai/ai.turn-registry";
import { generateDeviceAgentCommand } from "../ai/openai.service";

export function getDeviceAgentAllowedWriteRoots(
  settings: RunAgentTaskArgs["settings"],
): string[] {
  return [
    process.cwd(),
    settings.localFiles.agentsDirectory,
    settings.localFiles.conversationsDirectory,
    settings.localFiles.settingsPath,
  ];
}

export async function resolveDeviceAgentCommand(
  settings: RunAgentTaskArgs["settings"],
  task: RunAgentTaskArgs["task"],
): Promise<string> {
  if (task.mode === "command" && isLikelyShellCommand(task.request)) {
    return task.request.trim();
  }

  const workspace = await loadAgentWorkspace(settings.localFiles.agentsDirectory, task.agentId);
  const runtimeContext = createAgentRuntimeContext(settings.activeProvider);
  const controller = new AbortController();
  registerAbortController(task.turnId, controller);
  const deviceAgentReply = await generateDeviceAgentCommand(
    settings.openai,
    workspace.context,
    runtimeContext,
    task.request,
    task.userPrompt,
    controller.signal,
  );
  unregisterAbortController(task.turnId, controller);

  return deviceAgentReply.command.trim();
}

export function isLikelyShellCommand(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/\n/.test(trimmed)) return true;
  if (/[`$][({]/.test(trimmed)) return true;
  if (/\b(?:awk|cat|cut|df|echo|find|free|grep|head|ifconfig|ip|ls|nmap|ping|ps|route|sed|sw_vers|sysctl|tail|top|uname|vm_stat)\b/.test(trimmed)) {
    return true;
  }
  if (/[|&;<>]/.test(trimmed)) return true;
  if (/^(?:\w+=.+\s+)+(?:[A-Za-z_./-]+)/.test(trimmed)) return true;
  if (/^[./~A-Za-z0-9_-]+\s+[-]/.test(trimmed)) return true;
  return false;
}
