import { AgentTaskExecutionResult, RunAgentTaskArgs } from "./agent-task.types";
import {
  loadAgentWorkspace,
  recordAgentCommandExchange,
} from "./agent-storage.service";
import { createAgentRuntimeContext } from "./agent-prompt.service";
import { createAgentResultMessage } from "./agent-task.messages";
import { generateAgentTextReply } from "../ai/openai.service";
import {
  registerAbortController,
  setAgentConversationId,
  throwIfTurnStopped,
  unregisterAbortController,
} from "../ai/ai.turn-registry";

export async function runPlannerAgentTask(
  args: RunAgentTaskArgs,
  currentAgentConversationId: string | null,
): Promise<AgentTaskExecutionResult> {
  const {
    onPipelineStageChange,
    settings,
    task,
    turnId,
  } = args;
  const workspace = await loadAgentWorkspace(settings.localFiles.agentsDirectory, task.agentId);
  const runtimeContext = createAgentRuntimeContext(settings.activeProvider);
  const controller = new AbortController();
  registerAbortController(turnId, controller);
  onPipelineStageChange?.("agent-generating", task.agentId);
  const agentReply = await generateAgentTextReply(
    settings.openai,
    task.agentId,
    workspace.context,
    runtimeContext,
    task.request,
    task.userPrompt,
    "assistant",
    controller.signal,
  );
  unregisterAbortController(turnId, controller);
  throwIfTurnStopped(turnId);
  const deviceMessage = createAgentResultMessage(task.agentId, agentReply.text);
  deviceMessage.apiRequests = [...(agentReply.apiRecords ?? [])];
  const record = await recordAgentCommandExchange({
    agentId: task.agentId,
    agentConversationId: currentAgentConversationId,
    assistantRequest: task.request,
    command: task.request,
    result: {
      output: agentReply.text,
      status: "success",
    },
    rootDirectory: settings.localFiles.agentsDirectory,
    triggerMessageId: task.triggerMessageId,
    userAssistantConversationId: task.userAssistantConversationId,
    userPrompt: task.userPrompt,
  });
  setAgentConversationId(turnId, task.agentId, record.agentConversationId);

  return {
    deviceMessage,
    result: {
      agentConversationId: record.agentConversationId,
      kind: "completed",
      output: agentReply.text,
      request: task.request,
      resolvedCommand: task.request,
      status: "success",
    },
  };
}
