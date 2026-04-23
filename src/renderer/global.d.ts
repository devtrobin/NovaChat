import { PersistedChatState } from "./types/chat.types";
import {
  ChatTurnEvent,
  RunTurnRequest,
  RunTurnResult,
  StopTurnRequest,
  SubmitCommandInputRequest,
  SubmitPermissionDecisionRequest,
} from "../shared/ai.types";
import {
  ActiveAgentTask,
  AgentContextFile,
  AgentDirectConversationResult,
  AgentId,
  AgentPermissionDecision,
  AgentPermissionsFile,
  AgentWorkspaceData,
} from "../shared/agent.types";
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
      agents: {
        loadWorkspace: (agentId: AgentId) => Promise<AgentWorkspaceData>;
        saveContext: (agentId: AgentId, context: AgentContextFile) => Promise<AgentContextFile>;
        savePermission: (
          agentId: AgentId,
          command: string,
          decision: AgentPermissionDecision,
          remember: boolean,
        ) => Promise<AgentPermissionsFile>;
        deletePermission: (agentId: AgentId, command: string) => Promise<AgentPermissionsFile>;
        getActiveTasks: (agentId: AgentId) => Promise<ActiveAgentTask[]>;
        stopTask: (taskId: string) => Promise<boolean>;
        createDirectConversation: (agentId: AgentId, title: string) => Promise<AgentDirectConversationResult>;
        sendDirectMessage: (
          agentId: AgentId,
          prompt: string,
          conversationId?: string | null,
        ) => Promise<AgentDirectConversationResult>;
      };
      ai: {
        killCommand: (commandId: string) => Promise<void>;
        onEvent: (listener: (event: ChatTurnEvent) => void) => () => void;
        runTurn: (request: RunTurnRequest) => Promise<RunTurnResult>;
        stopTurn: (payload: StopTurnRequest) => Promise<boolean>;
        submitPermissionDecision: (payload: SubmitPermissionDecisionRequest) => Promise<boolean>;
        submitCommandInput: (payload: SubmitCommandInputRequest) => Promise<boolean>;
      };
    };
  }
}
