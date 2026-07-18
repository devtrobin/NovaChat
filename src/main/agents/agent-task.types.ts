import { ChatMessage } from "../../renderer/types/chat.types";
import { AgentId, AgentTaskRequest, AgentTaskResult } from "../../shared/agent.types";
import { AppSettings } from "../../shared/settings.types";
import type { PipelineStage } from "../ai/ai.orchestrator.cycle.messages";
import { Emit } from "../ai/ai.orchestrator.types";

export type RunAgentTaskArgs = {
  conversationId: string;
  emit: Emit;
  messageId: string;
  onPipelineStageChange?: (stage: PipelineStage, agentId?: AgentId) => void;
  settings: AppSettings;
  task: AgentTaskRequest;
  turnId: string;
};

export type AgentTaskExecutionResult = {
  deviceMessage: ChatMessage;
  result: AgentTaskResult;
};
