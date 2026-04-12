import { ChatMessage, Conversation } from "../types/chat.types";

type ChatResponse = {
  messages: ChatMessage[];
  title?: string;
};

export async function sendChatMessage(
  conversation: Conversation,
  prompt: string,
): Promise<ChatResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, 2200));

  const title =
    conversation.messages.length <= 1
      ? prompt.trim().slice(0, 36) || "Nouvelle conversation"
      : undefined;

  return {
    title,
    messages: buildResponseMessages(prompt),
  };
}

function buildAssistantReply(prompt: string): string {
  return `Recu: "${prompt.trim()}".\n\nProchaine etape: brancher ici le vrai backend de chat.`;
}

function buildResponseMessages(prompt: string): ChatMessage[] {
  const trimmedPrompt = prompt.trim();
  const createdAt = new Date().toISOString();

  if (trimmedPrompt.startsWith("/cmd ")) {
    const command = trimmedPrompt.replace("/cmd ", "").trim() || "pwd";

    return [
      {
        id: crypto.randomUUID(),
        from: "assistant",
        to: "device",
        content: command,
        createdAt,
        status: "pending",
      },
    ];
  }

  return [
    {
      id: crypto.randomUUID(),
      from: "assistant",
      to: "user",
      content: buildAssistantReply(prompt),
      createdAt,
    },
  ];
}
