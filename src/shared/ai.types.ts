import { ChatMessage } from "../renderer/types/chat.types";

export type RunTurnRequest = {
  conversationId: string;
  messages: ChatMessage[];
  title: string;
  userInput: string;
};

export type RunTurnResult = {
  ok: boolean;
};

export type SubmitCommandInputRequest = {
  commandId: string;
  value: string;
};

export type ChatTurnEvent =
  | {
      conversationId: string;
      messages: ChatMessage[];
      type: "append-messages";
    }
  | {
      conversationId: string;
      message: ChatMessage;
      messageId: string;
      type: "replace-message";
    }
  | {
      conversationId: string;
      messageId: string;
      type: "remove-message";
    }
  | {
      conversationId: string;
      title: string;
      type: "set-title";
    };
