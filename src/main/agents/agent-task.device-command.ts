import { createAgentRuntimeContext } from "./agent-prompt.service";
import { loadAgentWorkspace } from "./agent-storage.service";
import { RunAgentTaskArgs } from "./agent-task.types";
import { isLikelyShellCommand } from "../ai/ai.command-detection";
import { registerAbortController, unregisterAbortController } from "../ai/ai.turn-registry";
import { generateDeviceAgentCommand } from "../ai/openai.service";
import { GenerateDeviceAgentCommandResult } from "../ai/openai.types";

export { isLikelyShellCommand } from "../ai/ai.command-detection";

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
): Promise<GenerateDeviceAgentCommandResult> {
  if (task.mode === "command" && isLikelyShellCommand(task.request)) {
    return {
      apiRecords: [],
      command: task.request.trim(),
    };
  }

  const workspace = await loadAgentWorkspace(settings.localFiles.agentsDirectory, task.agentId);
  const runtimeContext = createAgentRuntimeContext(settings.activeProvider);
  const controller = new AbortController();
  registerAbortController(task.turnId, controller);
  try {
    const deviceAgentReply = await generateDeviceAgentCommand(
      settings.openai,
      workspace.context,
      runtimeContext,
      task.request,
      task.userPrompt,
      controller.signal,
    );
    return {
      apiRecords: deviceAgentReply.apiRecords,
      command: deviceAgentReply.command.trim(),
    };
  } finally {
    unregisterAbortController(task.turnId, controller);
  }
}
