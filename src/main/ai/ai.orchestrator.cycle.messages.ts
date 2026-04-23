import { ApiRequestRecord, ChatMessage } from "../../renderer/types/chat.types";
import { AgentId } from "../../shared/agent.types";
import {
  attachAssistantApiTrace,
  createAssistantDelegationMessage,
  createAssistantMessage,
  createInternalSystemMessage,
  createRunningDeviceMessage,
  createSystemMessage,
} from "./ai.message-factory";
import { appendLifecycleLog } from "./ai.orchestrator.runtime";

export function appendUserApiTrace(
  userMessage: ChatMessage,
  apiRecords: ApiRequestRecord[],
  step: number,
): ChatMessage {
  appendLifecycleLog(userMessage, "api-request-sent", `Requete ${step + 1} envoyee a l'assistant.`);
  appendLifecycleLog(userMessage, "api-response-received", `Reponse ${step + 1} recue depuis l'assistant.`);
  userMessage.apiRequests = [...(userMessage.apiRequests ?? []), ...apiRecords];
  return { ...userMessage };
}

export function createAssistantResponseMessage(content: string, apiRecords: ApiRequestRecord[]): ChatMessage {
  const message = createAssistantMessage(content);
  attachAssistantApiTrace(message, apiRecords);
  return message;
}

export function createDeviceRequestMessage(command: string, apiRecords: ApiRequestRecord[]): ChatMessage {
  const message = createRunningDeviceMessage(command, "");
  message.apiRequests = [...apiRecords];
  appendLifecycleLog(message, "api-response-attached", "Trace API associee a la commande device.");
  appendLifecycleLog(
    message,
    "assistant-requested-device",
    "L'assistant a demande une execution device.",
    { command, from: "assistant", to: "device" },
  );
  return message;
}

export function createAgentRequestMessage(
  agentId: "device-agent" | "diagnostic-agent",
  request: string,
  apiRecords: ApiRequestRecord[],
): ChatMessage {
  const message = createAssistantDelegationMessage(
    request,
    "agent",
    agentId,
  );
  message.apiRequests = [...apiRecords];
  appendLifecycleLog(message, "api-response-attached", "Trace API associee a la delegation agent.");
  appendLifecycleLog(
    message,
    "assistant-requested-agent",
    `L'assistant a delegue une tache a ${agentId}.`,
    { agentId, request, from: "assistant", to: "agent" },
  );
  return message;
}

export function createThinkingSystemMessage(): ChatMessage {
  return createPipelineSystemMessage("nova-thinking");
}

export type PipelineStage =
  | "agent-generating"
  | "analyzing-agent-result"
  | "executing-command"
  | "final-response"
  | "nova-thinking"
  | "requesting-agent"
  | "waiting-permission";

export function createPipelineSystemMessage(stage: PipelineStage, agentId?: AgentId): ChatMessage {
  return createSystemMessage(formatPipelineStage(stage, agentId));
}

function formatPipelineStage(stage: PipelineStage, agentId?: AgentId): string {
  const agentName = formatAgentName(agentId);
  if (stage === "requesting-agent") return `Tache en cours: demande a ${agentName}...`;
  if (stage === "agent-generating") return `Tache en cours: ${agentName} prepare une reponse...`;
  if (stage === "waiting-permission") return "Tache en cours: attente de permission utilisateur...";
  if (stage === "executing-command") return "Tache en cours: execution de la commande...";
  if (stage === "analyzing-agent-result") return `Tache en cours: analyse du resultat de ${agentName}...`;
  if (stage === "final-response") return "Tache en cours: generation de la reponse finale...";
  return "Tache en cours: reflexion de Nova...";
}

function formatAgentName(agentId?: AgentId): string {
  if (agentId === "device-agent") return "device-agent";
  if (agentId === "diagnostic-agent") return "diagnostic-agent";
  return "agent";
}

export function createInterruptedCommandContextMessage(): ChatMessage {
  return createInternalSystemMessage(
    "L'utilisateur a mis un terme a la commande device. Tu peux repondre directement sans nouvelle commande.",
  );
}
