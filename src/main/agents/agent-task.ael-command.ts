import { createAgentRuntimeContext } from "./agent-prompt.service";
import { loadAgentWorkspace } from "./agent-storage.service";
import { RunAgentTaskArgs } from "./agent-task.types";
import { isLikelyShellCommand } from "../ai/ai.command-detection";
import { registerAbortController, unregisterAbortController } from "../ai/ai.turn-registry";
import { generateAELAgentCommand } from "../ai/openai.service";
import { GenerateAELAgentCommandResult } from "../ai/openai.types";

export { isLikelyShellCommand } from "../ai/ai.command-detection";

export function getAELAgentAllowedWriteRoots(
  settings: RunAgentTaskArgs["settings"],
): string[] {
  return [
    process.cwd(),
    settings.localFiles.agentsDirectory,
    settings.localFiles.conversationsDirectory,
    settings.localFiles.settingsPath,
  ];
}

export async function resolveAELAgentCommand(
  settings: RunAgentTaskArgs["settings"],
  task: RunAgentTaskArgs["task"],
): Promise<GenerateAELAgentCommandResult> {
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
    const aelAgentReply = await generateAELAgentCommand(
      settings.openai,
      workspace.context,
      runtimeContext,
      task.request,
      task.userPrompt,
      controller.signal,
    );
    return {
      apiRecords: aelAgentReply.apiRecords,
      command: aelAgentReply.command.trim(),
    };
  } finally {
    unregisterAbortController(task.turnId, controller);
  }
}
