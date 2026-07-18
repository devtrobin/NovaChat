import {
  AgentHistoryEntry,
  AgentPermissionsFile,
} from "../../shared/agent.types";
import { PersistedChatState } from "../../shared/chat.types";

export function createDefaultPermissions(): AgentPermissionsFile {
  return {
    rules: [],
  };
}

export function createDefaultHistory(): AgentHistoryEntry[] {
  return [];
}

export function createDefaultConversations(): PersistedChatState {
  return {
    activeConversationId: null,
    conversations: [],
  };
}

export function recoverHistoryFromConversations(
  conversations: PersistedChatState,
): AgentHistoryEntry[] {
  const entries: AgentHistoryEntry[] = [];

  for (const conversation of conversations.conversations) {
    for (let index = 0; index < conversation.messages.length - 1; index += 2) {
      const assistantMessage = conversation.messages[index];
      const resultMessage = conversation.messages[index + 1];
      if (!assistantMessage || !resultMessage) continue;
      if (assistantMessage.from !== "assistant") continue;
      if (resultMessage.from !== "agent" && resultMessage.from !== "device") continue;

      const recoveredRequest = normalizeRecoveredAssistantRequest(assistantMessage.content);
      const recoveredCommand = resultMessage.from === "device"
        ? resultMessage.content
        : recoveredRequest || assistantMessage.content;
      const recoveredResult = resultMessage.result ?? resultMessage.content;
      const recoveredStatus = resultMessage.status === "success"
        ? "success"
        : resultMessage.status === "partial-success"
          ? "partial-success"
          : /refusee/i.test(recoveredResult)
            ? "denied"
            : /interrompu/i.test(recoveredResult)
              ? "interrupted"
              : "error";

      entries.push({
        agentConversationId: conversation.id,
        assistantRequest: recoveredRequest || assistantMessage.content,
        at: resultMessage.createdAt,
        command: recoveredCommand,
        result: recoveredResult,
        status: recoveredStatus,
        triggerMessageId: "",
        userAssistantConversationId: "",
      });
    }
  }

  return entries.sort((left, right) => right.at.localeCompare(left.at));
}

function normalizeRecoveredAssistantRequest(value: string): string {
  return value
    .replace(/^Execute la commande suivante sur le device:\n/i, "")
    .replace(/^Demande d'analyse envoyee a [^:\n]+:\n/i, "")
    .replace(/^Objectif delegue par l'assistant:\n/i, "")
    .trim();
}
