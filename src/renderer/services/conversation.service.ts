import { ChatMessage, Conversation, PersistedChatState } from "../types/chat.types";

const now = new Date().toISOString();

export function createDefaultConversations(): Conversation[] {
  return [
    {
      id: "conversation-1",
      title: "Accueil",
      createdAt: now,
      draft: "",
      updatedAt: now,
      messages: [
        {
          id: "message-1",
          from: "assistant",
          to: "user",
          content: "Bonjour. Le squelette du chat est pret.",
          createdAt: now,
        },
      ],
    },
  ];
}

export function createDefaultChatState(): PersistedChatState {
  const conversations = createDefaultConversations();

  return {
    activeConversationId: conversations[0]?.id ?? null,
    conversations,
  };
}

export async function loadStoredChatState(): Promise<PersistedChatState> {
  const storedState = await window.nova.chat.load();
  if (storedState.conversations.length > 0) {
    return {
      ...storedState,
      conversations: storedState.conversations.map((conversation) => ({
        ...conversation,
        draft: conversation.draft ?? "",
        messages: conversation.messages.filter((message) => message.from !== "system"),
      })),
    };
  }
  return createDefaultChatState();
}

export async function saveStoredChatState(state: PersistedChatState): Promise<void> {
  await window.nova.chat.save({
    ...state,
    conversations: state.conversations.map((conversation) => ({
      ...conversation,
      messages: conversation.messages.filter(isPersistedMessage),
    })),
  });
}

function isPersistedMessage(message: ChatMessage): boolean {
  return message.from !== "system";
}
