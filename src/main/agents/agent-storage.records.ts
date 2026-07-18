import {
  AgentConversationOrigin,
  AgentId,
} from "../../shared/agent.types";
import {
  ChatMessage,
  Conversation,
  PersistedChatState,
} from "../../shared/chat.types";

type AgentExchangeStatus = "denied" | "error" | "interrupted" | "partial-success" | "success";

export function createAgentConversationTitle(userPrompt: string): string {
  const title = userPrompt.trim().slice(0, 48);
  return title || "Execution device";
}

export function createAssistantTestConversationTitle(prompt: string): string {
  const title = prompt.trim().slice(0, 48);
  return title || "Test assistant";
}

export function createAgentConversation(
  title: string,
  origin: AgentConversationOrigin = "assistant",
): Conversation {
  const createdAt = new Date().toISOString();
  return {
    createdAt,
    draft: "",
    id: crypto.randomUUID(),
    messages: [],
    origin,
    title,
    updatedAt: createdAt,
  };
}

export function createAssistantTestMessage(agentId: AgentId, prompt: string): ChatMessage {
  const createdAt = new Date().toISOString();

  return {
    agentId,
    apiRequests: [],
    content: prompt,
    createdAt,
    from: "assistant",
    id: crypto.randomUUID(),
    lifecycleLog: [
      {
        at: createdAt,
        details: `Demande assistant simule -> ${agentId} creee.`,
        event: "created",
      },
    ],
    to: "agent",
  };
}

export function createDirectAgentReplyMessage(agentId: AgentId, output: string): ChatMessage {
  const createdAt = new Date().toISOString();

  return {
    agentId,
    apiRequests: [],
    content: output,
    createdAt,
    from: "agent",
    id: crypto.randomUUID(),
    lifecycleLog: [
      {
        at: createdAt,
        details: `Reponse ${agentId} -> assistant simule creee.`,
        event: "created",
      },
    ],
    status: "success",
    to: "assistant",
  };
}

export function createAssistantToAgentMessage(
  agentId: AgentId,
  assistantRequest: string,
  command: string,
): ChatMessage {
  const createdAt = new Date().toISOString();
  if (agentId !== "device-agent") {
    return {
      agentId,
      apiRequests: [],
      content: `Demande envoyee a ${agentId}:\n${assistantRequest}`,
      createdAt,
      from: "assistant",
      id: crypto.randomUUID(),
      lifecycleLog: [
        {
          at: createdAt,
          details: `Demande assistant -> ${agentId} creee.`,
          event: "created",
        },
      ],
      to: "agent",
    };
  }

  const isGoalRequest = /^goal\s*:/i.test(assistantRequest.trim());
  const content = isGoalRequest
    ? `Objectif delegue par l'assistant:\n${assistantRequest.replace(/^goal\s*:\s*/i, "").trim()}\n\nCommande retenue:\n${command}`
    : `Execute la commande suivante sur le device:\n${command}`;

  return {
    apiRequests: [],
    content,
    createdAt,
    from: "assistant",
    id: crypto.randomUUID(),
    lifecycleLog: [
      {
        at: createdAt,
        details: "Demande assistant -> device-agent creee.",
        event: "created",
      },
    ],
    to: "device",
  };
}

export function createAgentResultMessage(
  agentId: AgentId,
  command: string,
  output: string,
  status: AgentExchangeStatus,
): ChatMessage {
  const createdAt = new Date().toISOString();
  if (agentId !== "device-agent") {
    return {
      agentId,
      apiRequests: [],
      content: output,
      createdAt,
      from: "agent",
      id: crypto.randomUUID(),
      lifecycleLog: [
        {
          at: createdAt,
          details: `Resultat ${agentId} -> assistant cree.`,
          event: "created",
          metadata: { status },
        },
      ],
      status: status === "success" ? "success" : status === "partial-success" ? "partial-success" : "error",
      to: "assistant",
    };
  }

  return {
    apiRequests: [],
    content: command,
    createdAt,
    from: "device",
    id: crypto.randomUUID(),
    isExpandable: true,
    lifecycleLog: [
      {
        at: createdAt,
        details: "Resultat device-agent -> assistant cree.",
        event: "created",
        metadata: { status },
      },
    ],
    result: output,
    status: status === "success" ? "success" : status === "partial-success" ? "partial-success" : "error",
    to: "assistant",
  };
}

export function upsertConversation(
  state: PersistedChatState,
  conversation: Conversation,
): PersistedChatState {
  return {
    activeConversationId: conversation.id,
    conversations: [
      conversation,
      ...state.conversations.filter((entry) => entry.id !== conversation.id),
    ],
  };
}
