import { PersistedChatState } from "./types/chat.types";
import { ChatTurnEvent, RunTurnRequest, RunTurnResult } from "../shared/ai.types";
import { AppSettings, SettingsTestResult } from "../shared/settings.types";

export { };

declare global {
  interface Window {
    nova: {
      ping: () => Promise<{ ok: boolean; message: string; at: string }>;
      chat: {
        load: () => Promise<PersistedChatState>;
        save: (state: PersistedChatState) => Promise<void>;
      };
      settings: {
        load: () => Promise<AppSettings>;
        reset: () => Promise<AppSettings>;
        save: (settings: AppSettings) => Promise<AppSettings>;
        test: (settings: AppSettings) => Promise<SettingsTestResult>;
      };
      ai: {
        killCommand: (commandId: string) => Promise<void>;
        onEvent: (listener: (event: ChatTurnEvent) => void) => () => void;
        runTurn: (request: RunTurnRequest) => Promise<RunTurnResult>;
      };
    };
  }
}
