import { ApiRequestRecord, ChatMessage } from "../../shared/chat.types";
import { AgentId } from "../../shared/agent.types";
import { getSystemAgentDefinition } from "../../shared/system-agent.registry";
import {
  attachAssistantApiTrace,
  createAssistantDelegationMessage,
  createAssistantMessage,
  createInternalSystemMessage,
  createRunningAELMessage,
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

export function createAELRequestMessage(command: string, apiRecords: ApiRequestRecord[]): ChatMessage {
  const message = createRunningAELMessage(command, "");
  message.apiRequests = [...apiRecords];
  appendLifecycleLog(message, "api-response-attached", "Trace API associee a la commande AEL.");
  appendLifecycleLog(
    message,
    "assistant-requested-ael",
    "L'assistant a demande une execution AEL.",
    { command, from: "assistant", to: "ael" },
  );
  return message;
}

export function createAgentRequestMessage(
  agentId: AgentId,
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
  | "waiting-permission"
  | "writing-file";

export function createPipelineSystemMessage(stage: PipelineStage, agentId?: AgentId): ChatMessage {
  return createSystemMessage(formatPipelineStage(stage, agentId));
}

function formatPipelineStage(stage: PipelineStage, agentId?: AgentId): string {
  const agentName = formatAgentName(agentId);
  if (stage === "requesting-agent") return `Tache en cours: demande a ${agentName}...`;
  if (stage === "agent-generating") return `Tache en cours: ${agentName} prepare une reponse...`;
  if (stage === "waiting-permission") return "Tache en cours: attente de permission utilisateur...";
  if (stage === "executing-command") return "Tache en cours: execution de la commande...";
  if (stage === "writing-file") return "Tache en cours: creation et verification du fichier...";
  if (stage === "analyzing-agent-result") return `Tache en cours: analyse du resultat de ${agentName}...`;
  if (stage === "final-response") return "Tache en cours: generation de la reponse finale...";
  return "Tache en cours: reflexion de Nova...";
}

function formatAgentName(agentId?: AgentId): string {
  return agentId ? getSystemAgentDefinition(agentId).acronym : "agent";
}

export function createInterruptedCommandContextMessage(): ChatMessage {
  return createInternalSystemMessage(
    "L'utilisateur a mis un terme a la commande AEL. Tu peux repondre directement sans nouvelle commande.",
  );
}
